/* ============================================================
   思辨小院 · 单页路由 + 页面渲染
   ------------------------------------------------------------
   平台只伺服一个 html（index.html），所以页面切换走 hash 路由：
     #/            首页（月洞门 + 两个院门）
     #/xiaohe      小荷院（练习列表）
     #/shaonian    少年院（练习列表）
     #/article/xx  期详情（读一读/想一想/我的想法/小锦囊）
     #/methods     思辨方法屋
   ============================================================ */
(function () {
  "use strict";

  var view = document.getElementById("view");

  /* ---------- 小工具 ---------- */
  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function setModule(key) {
    if (key) document.body.setAttribute("data-module", key);
    else document.body.removeAttribute("data-module");
  }

  /* ---------- 视图：首页 ---------- */
  function renderHome() {
    setModule(null);
    document.title = "思辨小院 · 每天想一点点";

    function latestTitle(modKey) {
      var list = ISSUES.filter(function (i) { return i.module === modKey; });
      var last = list[list.length - 1];
      return last ? "第" + last.no + "期 · " + last.title : "小院布置中…";
    }

    view.innerHTML =
      '<section class="gate-wrap" aria-label="今日一问">' +
        '<div class="moon-gate">' +
          '<p class="gate-label">今日一问</p>' +
          '<p class="gate-question">' + escapeHtml(dailyQuestion()) + '</p>' +
          '<p class="gate-date">' + escapeHtml(dateCN()) + '</p>' +
        '</div>' +
        '<p class="gate-note">门里的问题每天换一个 · 想好了，吃饭时说给妈妈听</p>' +
      '</section>' +
      '<main class="doors" aria-label="练习入口">' +
        '<a class="door" href="#/xiaohe" style="--door-color: var(--lotus)">' +
          '<div class="door-top"><span class="door-name">小荷院</span><span class="door-grade">三年级 · 理解他人</span></div>' +
          '<div class="door-desc">换位思考 · 多角度看人 · 想想为什么</div>' +
          '<div class="door-latest"><span class="t">最新一期</span><span>' + escapeHtml(latestTitle("xiaohe")) + '</span><span class="go">进院 →</span></div>' +
        '</a>' +
        '<a class="door" href="#/shaonian" style="--door-color: var(--indigo)">' +
          '<div class="door-top"><span class="door-name">少年院</span><span class="door-grade">初三 · 批判性思维</span></div>' +
          '<div class="door-desc">事实还是观点 · 找证据 · 写小评论</div>' +
          '<div class="door-latest"><span class="t">最新一期</span><span>' + escapeHtml(latestTitle("shaonian")) + '</span><span class="go">进院 →</span></div>' +
        '</a>' +
      '</main>';
  }

  /* ---------- 视图：院子（模块列表） ---------- */
  function renderModule(modKey) {
    var mod = MODULES[modKey];
    if (!mod) { renderHome(); return; }
    setModule(modKey);
    document.title = mod.name + " · 思辨小院";

    var list = ISSUES.filter(function (i) { return i.module === modKey; }).reverse();
    var cards = list.map(function (i) {
      var written = getIdea(i.id).trim() ? '<span class="written">✍ 已写过想法</span>' : "";
      return '<a class="issue-card" href="#/article/' + encodeURIComponent(i.id) + '">' +
        '<p class="issue-no">' + mod.name + ' · 第' + i.no + '期 · ' + i.date + '</p>' +
        '<h2 class="issue-title">' + escapeHtml(i.title) + '</h2>' +
        '<p class="issue-intro">' + escapeHtml(i.intro) + '</p>' +
        '<p class="issue-meta">' + written + '<span>' + escapeHtml(i.source) + '</span></p>' +
        '</a>';
    }).join("");

    view.innerHTML =
      '<main class="mod-head">' +
        '<a class="crumb" href="#/">← 回院子</a>' +
        '<h1 class="mod-title">' + mod.name + '</h1>' +
        '<p class="mod-sub">' + mod.grade + ' · ' + mod.stage + '阶段</p>' +
        '<p class="mod-motto">' + mod.motto + '</p>' +
      '</main>' +
      '<section class="issue-list">' + (cards || '<p class="empty-note">小院正在布置，第一期马上来。</p>') + '</section>';
  }

  /* ---------- 视图：期详情 ---------- */
  function renderArticle(issueId) {
    var issue = findIssue(issueId);
    if (!issue) {
      setModule(null);
      document.title = "没找到这一期 · 思辨小院";
      view.innerHTML =
        '<main class="mod-head"><a class="crumb" href="#/">← 回院子</a>' +
        '<h1 class="mod-title" style="font-size:26px">这一期还没有呢</h1>' +
        '<p class="mod-sub">可能链接少了几个字。回院子里重新选一期吧。</p></main>';
      return;
    }
    var mod = MODULES[issue.module];
    setModule(issue.module);
    document.title = issue.title + " · " + mod.name + " · 思辨小院";

    var nums = ["①", "②", "③", "④", "⑤"];
    view.innerHTML =
      '<main class="art-head">' +
        '<a class="crumb" href="#/' + issue.module + '">← 回' + mod.name + '</a>' +
        '<p class="art-eyebrow">' + mod.name + ' · 第' + issue.no + '期 · ' + issue.date + '</p>' +
        '<h1 class="art-title">' + escapeHtml(issue.title) + '</h1>' +
        '<p class="art-source">' + escapeHtml(issue.source) + '</p>' +
      '</main>' +

      '<section class="step"><h2 class="step-head"><span class="num">' + nums[0] + '</span>读一读</h2>' +
        '<div class="reading">' +
          issue.reading.map(function (p) { return '<p>' + escapeHtml(p) + '</p>'; }).join("") +
          (issue.photoUrl ? '<a class="photo-link" href="' + escapeHtml(issue.photoUrl) + '" target="_blank" rel="noopener">📷 看报纸原版</a>' : "") +
        '</div>' +
      '</section>' +

      '<section class="step"><h2 class="step-head"><span class="num">' + nums[1] + '</span>想一想</h2>' +
        '<div class="qa">' +
          issue.questions.map(function (item, idx) {
            return '<details class="q"' + (idx === 0 ? " open" : "") + '>' +
              '<summary><span class="q-no">' + (idx + 1) + '</span>' + escapeHtml(item.q) + '</summary>' +
              (item.guides && item.guides.length
                ? '<ul class="guide-list"><li class="guide-title">思路路标</li>' +
                  item.guides.map(function (g) { return '<li>' + escapeHtml(g) + '</li>'; }).join("") +
                  '</ul>'
                : (item.hint ? '<p class="q-hint"><b>小提示</b> · ' + escapeHtml(item.hint) + '</p>' : "")) +
              '</details>';
          }).join("") +
        '</div>' +
      '</section>' +

      '<section class="step"><h2 class="step-head"><span class="num">' + nums[2] + '</span>我的想法</h2>' +
        '<label class="save-state" for="ideaBox" style="display:block;margin-bottom:8px">写你心里真实的想法，说错了也没关系。</label>' +
        '<textarea class="idea-box" id="ideaBox" placeholder="我想说……"></textarea>' +
        '<div class="idea-foot">' +
          '<span class="save-state" id="saveState"></span>' +
          '<button class="btn-mom" id="btnMom" type="button">发给妈妈</button>' +
        '</div>' +
        '<p class="idea-tip" id="ideaTip"></p>' +
      '</section>' +

      '<section class="step"><h2 class="step-head"><span class="num">' + nums[3] + '</span>思辨小锦囊</h2>' +
        '<div class="tip-card"><span class="tip-tag">小 锦 囊</span><br>' + escapeHtml(issue.tip) + '</div>' +
      '</section>' +

      '<section class="step step-reflect"><h2 class="step-head"><span class="num">' + nums[4] + '</span>反思区</h2>' +
        '<div id="reflectBox">' + reflectHtml(issue) + '</div>' +
      '</section>';

    bindIdeaBox(issue, mod);
    bindReflect();
  }

  /* ---------- 反思区：发给妈妈后解锁（自检三问 + 多一个角度） ---------- */
  var SELF_CHECK = {
    xiaohe: ["我说清楚了吗？", "我替他想过了吗？", "我说“为什么”了吗？"],
    shaonian: ["我有观点吗？", "我有理由吗？", "我有例子吗？"]
  };

  function reflectHtml(issue) {
    if (!isReflectOpen(issue.id)) {
      return '<p class="reflect-locked">🔒 写完想法、发给妈妈，这里就会打开。</p>';
    }
    var checks = SELF_CHECK[issue.module] || SELF_CHECK.xiaohe;
    return '<div class="reflect-card">' +
        '<p class="reflect-head">想法发出去之前，先自己点点看：</p>' +
        '<ul class="check-list">' +
          checks.map(function (c) { return '<li class="check-item" role="button" tabindex="0">' + escapeHtml(c) + '</li>'; }).join("") +
        '</ul>' +
      '</div>' +
      (issue.angles && issue.angles.length
        ? '<div class="angle-card">' +
            '<p class="angle-head">多一个角度</p>' +
            '<ul class="angle-list">' +
              issue.angles.map(function (a) { return '<li>' + escapeHtml(a) + '</li>'; }).join("") +
            '</ul>' +
            '<p class="angle-note">这不是答案，是另一扇窗。</p>' +
          '</div>'
        : "") +
      (issue.ending && issue.ending.length
        ? '<div class="ending-card">' +
            '<p class="ending-head">✉ 作者的真结局</p>' +
            issue.ending.map(function (p) { return '<p>' + escapeHtml(p) + '</p>'; }).join("") +
            '<p class="ending-note">你猜中了吗？不一样也没关系——你写下的那一版结局，只属于你。</p>' +
          '</div>'
        : "");
  }

  /* 自检三问：点击打勾（只在自己屏幕上点着玩，不用保存） */
  function bindReflect() {
    var items = document.querySelectorAll(".check-item");
    Array.prototype.forEach.call(items, function (li) {
      function toggle() { li.classList.toggle("checked"); }
      li.addEventListener("click", toggle);
      li.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      });
    });
  }

  /* 我的想法：自动保存 + 发给妈妈 */
  function bindIdeaBox(issue, mod) {
    var ideaBox = document.getElementById("ideaBox");
    var saveState = document.getElementById("saveState");
    var ideaTip = document.getElementById("ideaTip");
    ideaBox.value = getIdea(issue.id);
    if (ideaBox.value.trim()) showSaved("上次写到这里了");

    var timer = null;
    ideaBox.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        saveIdea(issue.id, ideaBox.value);
        showSaved("已自动保存");
      }, 400);
    });

    function showSaved(prefix) {
      var now = new Date();
      var hm = ("0" + now.getHours()).slice(-2) + ":" + ("0" + now.getMinutes()).slice(-2);
      saveState.textContent = prefix + " · " + hm;
    }

    var btnMom = document.getElementById("btnMom");
    btnMom.addEventListener("click", function () {
      var idea = ideaBox.value.trim();
      if (!idea) {
        ideaTip.textContent = "先写两句你的想法，再发给妈妈呀。";
        ideaBox.focus();
        return;
      }
      ideaTip.textContent = "";
      saveIdea(issue.id, ideaBox.value);

      var text =
        "【思辨小院 · " + mod.name + " 第" + issue.no + "期】" + issue.title + "\n\n" +
        "今天的题目：\n" +
        issue.questions.map(function (item, idx) { return (idx + 1) + ". " + item.q; }).join("\n") +
        "\n\n我的想法：\n" + idea + "\n\n（来自思辨小院 · 这里没有标准答案）";

      copyText(text).then(function () {
        btnMom.textContent = "已复制 ✓ 去微信发给妈妈";
        btnMom.classList.add("done");
        /* 复制成功 = 想法发出去了 → 解锁这一期的反思区 */
        if (!isReflectOpen(issue.id)) {
          openReflect(issue.id);
          var box = document.getElementById("reflectBox");
          if (box) {
            box.innerHTML = reflectHtml(issue);
            bindReflect();
            var sec = box.parentElement;
            if (sec && sec.scrollIntoView) {
              try { sec.scrollIntoView({ behavior: "smooth" }); } catch (e) { sec.scrollIntoView(); }
            }
          }
        }
        setTimeout(function () {
          btnMom.textContent = "发给妈妈";
          btnMom.classList.remove("done");
        }, 3000);
      }).catch(function () {
        ideaTip.textContent = "复制没成功——长按上面的文字手动复制一下也可以。";
      });
    });

    function copyText(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
      }
      return new Promise(function (resolve, reject) {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy") ? resolve() : reject(); }
        catch (e) { reject(e); }
        document.body.removeChild(ta);
      });
    }
  }

  /* ---------- 视图：思辨方法屋 ---------- */
  var METHODS = [
    { c: "事", t: "事实，还是观点",
      b: "事实是能查证的：今天下了雨。观点是个人看法：我不喜欢下雨。争论之前，先分清对方说的是哪一种。",
      e: "试一试：把一句话拆成“事实部分”和“观点部分”。", w: "看到一种说法、忍不住想反驳的时候。" },
    { c: "步", t: "三步法：我认为—因为—例如",
      b: "观点一句，理由一句，然后必须跟一个具体的例子。没有例子的观点，像一张没有腿的桌子。",
      e: "我认为应该多设饮水机，因为同学常忘带水，例如上周运动会就有三个班借水杯。", w: "写想法、说服别人的时候。" },
    { c: "问", t: "换位三连问",
      b: "他做了什么？→ 他为什么这么做？→ 如果我是他，我会怎么做？三个问题问完，很多“讨厌”会变成“可以理解”。",
      e: "适用对象：同学、老师、故事里的角色、爸爸妈妈。", w: "觉得别人“莫名其妙”的时候。" },
    { c: "情", t: "情绪化表达 ≠ 表达情绪",
      b: "大哭大闹、摔门，是被情绪牵着走；说“我感到委屈，因为……我希望……”，是把情绪说出来。两种都难受，但只有第二种能被听见。",
      e: "委屈的孙悟空：摔棒子走人 vs 平静地跟师傅说清楚。", w: "生气、委屈、想发火的时候。" },
    { c: "讲", t: "讲给妈妈听",
      b: "能把它讲清楚，才是真的懂了；讲不清楚的地方，就是还没懂的地方。这是费曼学习法的核心：用输出来检验输入。",
      e: "练习里的“发给妈妈”按钮，就是在做这件事。", w: "读完、学完任何东西之后。" },
    { c: "三", t: "三句话概括",
      b: "读完合上材料，用三句话讲出大意。讲不出来，说明刚才只是眼睛在动，脑子没跟上。",
      e: "每期练习的第一问，练的就是它。", w: "每次读完一篇文章。" },
    { c: "审", t: "审题三问",
      b: "是什么？→ 为什么？→ 怎么办？任何题目先过这三问，就不会跑题，也不会没话说。",
      e: "“用 AI 写作业算不算本事”：本事指什么？为什么有人觉得不算？什么情况下可以用？", w: "写作、发言、想不清楚的时候。" },
    { c: "角", t: "换个角度想：六条路",
      b: "局部—整体 · 片面—全面 · 横向—纵向 · 现象—本质 · 主体—客体 · 历史—现实。别人都在写“是什么”的时候，你追问一句“为什么会这样”，角度就有了。",
      e: "大家都去打卡同一家店——别人写“店真火”，你可以想：为什么我们想去的，恰恰是别人都去的地方？", w: "想写出跟别人不一样的观点时。" }
  ];

  function renderMethods() {
    setModule(null);
    document.title = "思辨方法屋 · 思辨小院";
    view.innerHTML =
      '<main class="mod-head">' +
        '<a class="crumb" href="#/">← 回院子</a>' +
        '<h1 class="mod-title">思辨方法屋</h1>' +
        '<p class="mod-sub">练习里用得上的八个小工具，随用随取。</p>' +
      '</main>' +
      '<section class="m-grid">' +
        METHODS.map(function (m) {
          return '<div class="m-card">' +
            '<div class="m-head"><span class="m-char">' + m.c + '</span><h2 class="m-title">' + m.t + '</h2></div>' +
            '<p class="m-body">' + m.b + '<span class="eg">' + m.e + '</span></p>' +
            '<p class="m-when">什么时候用：' + m.w + '</p>' +
            '</div>';
        }).join("") +
      '</section>';
  }

  /* ---------- 路由 ---------- */
  function router() {
    var hash = location.hash.replace(/^#\/?/, "");
    var parts = hash.split("/").filter(Boolean);

    if (!parts.length) renderHome();
    else if (parts[0] === "methods") renderMethods();
    else if (parts[0] === "article") renderArticle(decodeURIComponent(parts[1] || ""));
    else if (parts[0] === "xiaohe" || parts[0] === "shaonian") renderModule(parts[0]);
    else renderHome();

    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", router);
  router();
})();
