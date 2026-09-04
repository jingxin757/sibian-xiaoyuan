import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { CapabilityService } from '@lark-apaas/fullstack-nestjs-core';

/**
 * 思辨小院 · AI 先生陪练
 *
 * 设计红线（见项目方案_v2.2）：AI 只追问、不判对错、不给答案。
 * 人设与收尾指令在服务端注入，提示词模板在插件实例配置里，前端传不了。
 */

const CHAT_INSTANCE_ID = 'sibian-mentor-chat';
const TTS_INSTANCE_ID = 'sibian-mentor-tts';
const CHAT_ACTION = 'textGenerate';
const TTS_ACTION = 'speechSynthesis';

/** 陪练轮数上限（AI 先生最多回复 3 次，之后引导发给妈妈） */
const MAX_ROUNDS = 3;

const PERSONAS: Record<string, string> = {
  xiaohe:
    '你叫「荷花姐姐」，陪一个小学三年级的孩子练习表达。语气亲切温和，像讲故事一样；句子要短，每句不超过 15 个字；可以偶尔用一个可爱的语气词。整段回复不超过 60 个字。',
  shaonian:
    '你叫「问石先生」，陪一个初三的学生练习思维。语气简洁克制，像一位欣赏学生的老师；追问可以锋利一点，但始终保持尊重。整段回复不超过 100 个字。',
};

const FINAL_NOTE =
  '【特别提醒】这是陪练的最后一轮：这一段不要再抛新的问题，改为两句话收尾——一句肯定孩子这一路思考的变化，一句提醒他把打磨好的想法点一下「发给妈妈」。';
/** 平台对必填参数不接受空字符串，非最后一轮也要传一句占位指令 */
const NORMAL_NOTE = '这还不是最后一轮，正常按「复述＋追问＋鼓励」回复即可。';

const VOICES: Record<string, string> = {
  xiaohe: 'zh_female_qingxinnvsheng_mars_bigtts',
  shaonian: 'zh_male_qingshuangnanda_mars_bigtts',
};

export interface MentorTurn {
  role: 'child' | 'mentor';
  text: string;
}

export interface MentorChatDto {
  yard?: unknown;
  title?: unknown;
  questions?: unknown;
  idea?: unknown;
  history?: unknown;
}

export interface MentorTtsDto {
  yard?: unknown;
  text?: unknown;
}

/** 把 unknown 收敛成限长纯文本 */
function asText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  return text.length > max ? text.slice(0, max) : text;
}

/** 聚合后的流式输出可能是 {content} / {response} / 纯字符串，统一取文本 */
function extractText(output: unknown): string {
  if (typeof output === 'string') return output.trim();
  if (output && typeof output === 'object') {
    const obj = output as { content?: unknown; response?: unknown };
    if (typeof obj.content === 'string') return obj.content.trim();
    if (typeof obj.response === 'string') return obj.response.trim();
  }
  return '';
}

/** 校验并收敛前端传来的对话历史（最多保留最近 8 条） */
function normalizeHistory(value: unknown): MentorTurn[] {
  if (!Array.isArray(value)) return [];
  const turns: MentorTurn[] = [];
  for (const raw of value.slice(-8)) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as { role?: unknown; text?: unknown };
    const role = item.role === 'mentor' ? 'mentor' : item.role === 'child' ? 'child' : null;
    const text = asText(item.text, 300);
    if (!role || !text) continue;
    turns.push({ role, text });
  }
  return turns;
}

/** 把题目 + 思路路标拼成编号文本块（供 AI 参考，孩子已看过） */
function buildQuestionsBlock(value: unknown): string {
  if (!Array.isArray(value)) return '（本期没有题目信息）';
  const lines: string[] = [];
  value.slice(0, 8).forEach((raw, idx) => {
    if (!raw || typeof raw !== 'object') return;
    const item = raw as { q?: unknown; guides?: unknown };
    const q = asText(item.q, 200);
    if (!q) return;
    let line = `${idx + 1}. ${q}`;
    if (Array.isArray(item.guides) && item.guides.length) {
      const guides = item.guides
        .slice(0, 4)
        .map((g) => asText(g, 120))
        .filter(Boolean)
        .join('／');
      if (guides) line += `\n   思路路标：${guides}`;
    }
    lines.push(line);
  });
  const block = lines.join('\n');
  if (!block) return '（本期没有题目信息）';
  return block.length > 2500 ? `${block.slice(0, 2500)}…` : block;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @Inject(CapabilityService) private readonly capabilityService: CapabilityService,
  ) {}

  /** AI 先生追问陪练：固定三段式（复述 + 追问 + 鼓励），不判对错 */
  async chat(dto: MentorChatDto): Promise<{ reply: string; roundsLeft: number }> {
    const yard = dto.yard === 'shaonian' ? 'shaonian' : 'xiaohe';
    const title = asText(dto.title, 60) || '本期练习';
    const idea = asText(dto.idea, 500);
    if (!idea) {
      throw new BadRequestException('孩子还没写下想法');
    }

    const history = normalizeHistory(dto.history);
    const roundsUsed = history.filter((t) => t.role === 'mentor').length;
    if (roundsUsed >= MAX_ROUNDS) {
      throw new BadRequestException('陪练轮数已用完，把想法发给妈妈吧');
    }
    const isFinalRound = roundsUsed === MAX_ROUNDS - 1;

    const historyBlock = history.length
      ? history.map((t) => `${t.role === 'child' ? '孩子' : '先生'}：${t.text}`).join('\n')
      : '（还没有聊过）';

    const input = {
      persona_block: PERSONAS[yard],
      story_title: title,
      questions_block: buildQuestionsBlock(dto.questions),
      child_idea: idea,
      history_block: historyBlock,
      final_note: isFinalRound ? FINAL_NOTE : NORMAL_NOTE,
    };

    try {
      const output = await this.capabilityService
        .load(CHAT_INSTANCE_ID)
        .call(CHAT_ACTION, input);
      const reply = extractText(output);
      if (!reply) {
        throw new Error('empty reply');
      }
      return { reply, roundsLeft: MAX_ROUNDS - roundsUsed - 1 };
    } catch (error) {
      this.logger.error('mentor chat failed', {
        pluginInstanceId: CHAT_INSTANCE_ID,
        actionKey: CHAT_ACTION,
        outputMode: 'stream',
        inputKeys: Object.keys(input),
        resultType: typeof error === 'object' && error !== null ? error.constructor.name : typeof error,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      throw error instanceof BadRequestException
        ? error
        : new BadRequestException('先生这会儿走神了，等一下再试试');
    }
  }

  /** AI 先生朗读：两院两种声音 */
  async tts(dto: MentorTtsDto): Promise<{ audioUrl: string }> {
    const yard = dto.yard === 'shaonian' ? 'shaonian' : 'xiaohe';
    const text = asText(dto.text, 300);
    if (!text) {
      throw new BadRequestException('没有可朗读的文本');
    }

    const input = { text, voice: VOICES[yard] };
    try {
      const output = await this.capabilityService
        .load(TTS_INSTANCE_ID)
        .call(TTS_ACTION, input);
      const audioUrl =
        output && typeof output === 'object'
          ? String((output as { audioUrl?: unknown }).audioUrl ?? '')
          : '';
      if (!audioUrl) {
        throw new Error('empty audioUrl');
      }
      return { audioUrl };
    } catch (error) {
      this.logger.error('mentor tts failed', {
        pluginInstanceId: TTS_INSTANCE_ID,
        actionKey: TTS_ACTION,
        outputMode: 'unary',
        inputKeys: Object.keys(input),
        resultType: typeof error === 'object' && error !== null ? error.constructor.name : typeof error,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      throw new BadRequestException('朗读这会儿不方便，稍后再试');
    }
  }
}
