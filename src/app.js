(function () {
  var D = APP_DATA;
  var SQL = null;
  var state = { q: D.QUERIES[0], variant: 0, table: 'student', expected: null };

  function $(s) { return document.querySelector(s); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function qById(id) { for (var i = 0; i < D.QUERIES.length; i++) if (D.QUERIES[i].id === id) return D.QUERIES[i]; return null; }
  function qNum(q) { return 'Q' + (D.QUERIES.indexOf(q) + 1); }

  /* ---------- SQL ---------- */
  function run(sql) {
    var db = new SQL.Database();
    db.exec(D.SEED_SQL);
    var last = null, n = 0, modified = 0;
    try {
      var it = db.iterateStatements(sql);
      for (var stmt of it) {
        n++;
        var cols = stmt.getColumnNames();
        var vals = [], cap = false;
        while (stmt.step()) {
          if (vals.length >= 2000) { cap = true; break; }
          vals.push(stmt.get());
        }
        stmt.free();
        if (cols.length) last = { columns: cols, values: vals, capped: cap };
        else modified = db.getRowsModified();
      }
      if (n === 0) return { error: '沒有可執行的陳述式。編輯器是空的，或只有註解。', raw: '' };
      if (!last) return { columns: [], values: [], noRows: true, statements: n, modified: modified };
      last.statements = n;
      return last;
    } catch (e) {
      return { error: explainError(e.message), raw: e.message };
    } finally {
      db.close();
    }
  }

  function explainError(m) {
    if (/misuse of aggregate/i.test(m)) return 'SUM、COUNT、AVG 這類聚合函數不能放在 WHERE，因為 WHERE 在分組之前執行。加總後的條件請寫在 HAVING。';
    if (/no such column/i.test(m)) return '找不到這個欄位。檢查欄位名稱拼字，以及前面的別名（例如 s.、e.）是否對應到正確的表。';
    if (/no such table/i.test(m)) return '找不到這張表。這個資料庫只有 department、teacher、student、course、course_time、enrollment。';
    if (/ambiguous column/i.test(m)) return '這個欄位名稱同時出現在多張表裡，請在前面加上表的別名，例如 s.dept_id。';
    if (/syntax error/i.test(m)) return 'SQL 語法有誤。常見原因：少了逗號、多了逗號、括號沒配對，或關鍵字順序錯（要依序 SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY）。';
    if (/incomplete input/i.test(m)) return 'SQL 還沒寫完，可能少了右括號或引號。';
    if (/CHECK constraint/i.test(m)) return '寫入的值違反 CHECK 限制，例如年級不在 1–4，或成績不在 0–100。';
    if (/UNIQUE constraint|PRIMARY KEY/i.test(m)) return '主鍵或唯一值重複了，同一個值不能出現兩次。';
    if (/FOREIGN KEY/i.test(m)) return '外來鍵找不到對應的資料，例如 dept_id 寫了不存在的系所。';
    return '';
  }

  /* ---------- comparison ---------- */
  function keyOf(row) { return JSON.stringify(row); }
  function diffRows(a, b) {
    // rows of b not matched in a, rows of a not matched in b (multiset)
    function unmatched(src, ref) {
      var bag = new Map();
      ref.forEach(function (r) { var k = keyOf(r); bag.set(k, (bag.get(k) || 0) + 1); });
      var out = [];
      src.forEach(function (r, i) {
        var k = keyOf(r), c = bag.get(k) || 0;
        if (c > 0) bag.set(k, c - 1); else out.push(i);
      });
      return out;
    }
    return { extraInB: unmatched(b.values, a.values), missingInB: unmatched(a.values, b.values) };
  }
  function sameCols(a, b) { return a.columns.length === b.columns.length && a.columns.every(function (c, i) { return c === b.columns[i]; }); }

  /* ---------- rendering helpers ---------- */
  function isNum(v) { return typeof v === 'number'; }
  function fmt(v) {
    if (v === null || v === undefined) return '<span class="null">NULL</span>';
    if (typeof v === 'number' && !Number.isInteger(v)) return esc(+v.toFixed(4));
    return esc(v);
  }
  function tableHtml(res, opt) {
    opt = opt || {};
    var mark = opt.mark || {};
    var hasMk = !!opt.marks;
    var h = '<div class="dt-scroll"><table class="dt"><thead><tr>' + (hasMk ? '<th></th>' : '');
    res.columns.forEach(function (c) { h += '<th>' + esc(c) + '</th>'; });
    h += '</tr></thead><tbody>';
    res.values.forEach(function (row, i) {
      var cls = mark[i] || '';
      h += '<tr' + (cls ? ' class="' + cls + '"' : '') + '>';
      if (hasMk) h += '<td class="mk">' + (cls === 'plus' ? '+' : cls === 'minus' ? '−' : '') + '</td>';
      row.forEach(function (v) {
        var c = isNum(v) ? 'num' : (typeof v === 'string' && /^[A-Z]{1,2}\d{2,6}$|^[A-Z]{2}$/.test(v) ? 'id' : '');
        h += '<td' + (c ? ' class="' + c + '"' : '') + '>' + fmt(v) + '</td>';
      });
      h += '</tr>';
    });
    if (opt.missingRows && opt.missingRows.length) {
      opt.missingRows.forEach(function (row) {
        h += '<tr class="minus">' + (hasMk ? '<td class="mk">−</td>' : '');
        row.forEach(function (v) { h += '<td' + (isNum(v) ? ' class="num"' : '') + '>' + fmt(v) + '</td>'; });
        h += '</tr>';
      });
    }
    h += '</tbody></table></div>';
    return h;
  }
  function resultBlock(res, opt) {
    if (res.error !== undefined) {
      return '<div class="err"><b>執行失敗</b><code>' + esc(res.raw || res.error) + '</code>' + (res.raw && res.error ? '<span>' + esc(res.error) + '</span>' : '') + '</div>';
    }
    if (res.noRows) {
      return '<div class="empty">已執行 ' + res.statements + ' 個陳述式，最後一個不回傳資料' + (res.modified ? '（影響 ' + res.modified + ' 列）' : '') + '。在後面加一句 SELECT 就能看到結果。</div>';
    }
    if (!res.values.length && !(opt && opt.missingRows && opt.missingRows.length)) {
      return '<div class="empty">查詢成功，但沒有任何一列符合條件（0 列）。</div>' + (res.columns.length ? '<div class="diffnote">欄位：' + res.columns.map(esc).join('、') + '</div>' : '');
    }
    return tableHtml(res, opt);
  }
  function countText(res) {
    if (!res || res.error !== undefined || res.noRows) return '';
    return res.values.length + ' 列' + (res.capped ? '（只顯示前 2000 列）' : '');
  }

  /* SQL highlight for read-only views */
  var KW = /\b(SELECT|FROM|WHERE|AND|OR|NOT|IN|AS|JOIN|LEFT|INNER|ON|GROUP|BY|HAVING|ORDER|DESC|ASC|COUNT|SUM|AVG|MIN|MAX|ROUND|COALESCE|CASE|WHEN|THEN|END|NULL|IS|DISTINCT|LIMIT|EXISTS|BETWEEN|LIKE)\b/g;
  function hl(line) {
    return line.split(/('(?:[^']|'')*')/).map(function (part, i) {
      if (i % 2 === 1) return '<span class="s">' + esc(part) + '</span>';
      return esc(part).replace(KW, '<span class="k">$1</span>');
    }).join('');
  }
  function lineDiff(a, b) {
    var A = a.split('\n'), B = b.split('\n'), n = A.length, m = B.length;
    var L = [];
    for (var i = 0; i <= n; i++) { L.push(new Array(m + 1).fill(0)); }
    for (i = n - 1; i >= 0; i--) for (var j = m - 1; j >= 0; j--)
      L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    var out = []; i = 0; j = 0;
    while (i < n && j < m) {
      if (A[i] === B[j]) { out.push(['', B[j]]); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) { out.push(['del', A[i]]); i++; }
      else { out.push(['add', B[j]]); j++; }
    }
    while (i < n) out.push(['del', A[i++]]);
    while (j < m) out.push(['add', B[j++]]);
    return out;
  }

  /* ---------- 1. timetable ---------- */
  function renderTimetable() {
    var r = run("SELECT t.weekday, t.start_period, t.end_period, c.course_name, t.room FROM enrollment e JOIN course c ON c.course_id = e.course_id JOIN course_time t ON t.course_id = c.course_id WHERE e.student_id = 'B113001'");
    if (r.error) return;
    var grid = {};
    r.values.forEach(function (v) {
      for (var p = v[1]; p <= v[2]; p++) {
        var k = v[0] + '-' + p;
        (grid[k] = grid[k] || []).push({ name: v[3], room: v[4] });
      }
    });
    var days = ['一', '二', '三', '四', '五'];
    var h = '<thead><tr><th class="p">節</th>' + days.map(function (d) { return '<th>' + d + '</th>'; }).join('') + '</tr></thead><tbody>';
    for (var p = 1; p <= 8; p++) {
      h += '<tr><th class="p" scope="row">' + p + '</th>';
      for (var d = 1; d <= 5; d++) {
        var cell = grid[d + '-' + p];
        if (!cell) { h += '<td></td>'; continue; }
        var cls = cell.length > 1 ? 'on clash' : 'on';
        h += '<td class="' + cls + '">' + cell.map(function (c) { return esc(c.name) + '<span class="rm">' + esc(c.room) + '</span>'; }).join('') + '</td>';
      }
      h += '</tr>';
    }
    $('#timetable').innerHTML = h + '</tbody>';
  }
  function renderTimetableSkeleton() {
    var days = ['一', '二', '三', '四', '五'];
    var h = '<thead><tr><th class="p">節</th>' + days.map(function (d) { return '<th>' + d + '</th>'; }).join('') + '</tr></thead><tbody>';
    for (var p = 1; p <= 8; p++) { h += '<tr><th class="p">' + p + '</th>' + '<td></td>'.repeat(5) + '</tr>'; }
    $('#timetable').innerHTML = h + '</tbody>';
  }

  /* ---------- 2. ERD ---------- */
  function renderERD() {
    var W = 232, HEAD = 36, ROW = 24;
    var POS = {
      student: [20, 16], department: [364, 16], teacher: [708, 16],
      enrollment: [20, 236], course: [364, 236], course_time: [20, 392]
    };
    var T = {}; D.TABLES.forEach(function (t) { T[t.name] = t; });
    function rowY(t, col) {
      var idx = T[t].columns.findIndex(function (c) { return c.name === col; });
      return POS[t][1] + HEAD + idx * ROW + ROW / 2;
    }
    function side(t, s) { return s === 'L' ? POS[t][0] : POS[t][0] + W; }
    var s = '<svg viewBox="0 0 960 560" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="選課與課表資料庫 ERD">';
    s += '<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="e-head"/></marker></defs>';
    s += '<style>.e{fill:none;stroke:var(--muted);stroke-width:1.4}.e-head{fill:var(--muted)}.bx{fill:var(--surface);stroke:var(--line);stroke-width:1.2}.hd{fill:var(--accent-soft)}.tn{font:600 14px var(--f-mono);fill:var(--ink)}.tz{font:500 12px var(--f-body);fill:var(--muted)}.cn{font:400 12.5px var(--f-mono);fill:var(--ink)}.ty{font:400 11px var(--f-mono);fill:var(--muted)}.pk{fill:var(--accent)}.pkt{font:600 9.5px var(--f-mono);fill:var(--surface)}.fkb{fill:none;stroke:var(--accent)}.fkt{font:600 9.5px var(--f-mono);fill:var(--accent)}.sep{stroke:var(--line)}.card{font:600 12px var(--f-mono);fill:var(--accent)}</style>';

    function curve(x1, y1, x2, y2) {
      var dir = x2 > x1 ? 1 : -1;
      var dx = Math.max(40, Math.abs(x2 - x1) / 2) * dir;
      return 'M' + x1 + ',' + y1 + ' C' + (x1 + dx) + ',' + y1 + ' ' + (x2 - dx) + ',' + y2 + ' ' + x2 + ',' + y2;
    }
    var edges = [
      { f: ['student', 'dept_id', 'R'], t: ['department', 'dept_id', 'L'] },
      { f: ['teacher', 'dept_id', 'L'], t: ['department', 'dept_id', 'R'] },
      { f: ['enrollment', 'student_id', 'L'], t: ['student', 'student_id', 'L'], bx: 8 },
      { f: ['enrollment', 'course_id', 'R'], t: ['course', 'course_id', 'L'] },
      { f: ['course_time', 'course_id', 'R'], t: ['course', 'course_id', 'L'] },
      { f: ['course', 'dept_id', 'R'], t: ['department', 'dept_id', 'R'], bx: 612 },
      { f: ['course', 'teacher_id', 'R'], t: ['teacher', 'teacher_id', 'L'] }
    ];
    var labels = '';
    edges.forEach(function (e) {
      var x1 = side(e.f[0], e.f[2]), y1 = rowY(e.f[0], e.f[1]);
      var x2 = side(e.t[0], e.t[2]), y2 = rowY(e.t[0], e.t[1]);
      var d = e.bx !== undefined ? ('M' + x1 + ',' + y1 + ' H' + e.bx + ' V' + y2 + ' H' + x2) : curve(x1, y1, x2, y2);
      s += '<path class="e" d="' + d + '" marker-end="url(#arr)"/>';
      var fo = e.f[2] === 'R' ? 7 : -15, to = e.t[2] === 'R' ? 9 : -16;
      labels += '<text class="card" x="' + (x1 + fo) + '" y="' + (y1 - 5) + '">N</text>';
      labels += '<text class="card" x="' + (x2 + to) + '" y="' + (y2 - 6) + '">1</text>';
    });
    D.TABLES.forEach(function (t) {
      var x = POS[t.name][0], y = POS[t.name][1], h = HEAD + t.columns.length * ROW + 4;
      s += '<g><rect class="bx" x="' + x + '" y="' + y + '" width="' + W + '" height="' + h + '" rx="8"/>';
      s += '<path class="hd" d="M' + (x + 0.6) + ',' + (y + HEAD) + ' V' + (y + 8) + ' Q' + (x + 0.6) + ',' + (y + 0.6) + ' ' + (x + 8) + ',' + (y + 0.6) + ' H' + (x + W - 8) + ' Q' + (x + W - 0.6) + ',' + (y + 0.6) + ' ' + (x + W - 0.6) + ',' + (y + 8) + ' V' + (y + HEAD) + ' Z"/>';
      s += '<text class="tn" x="' + (x + 12) + '" y="' + (y + 23) + '">' + t.name + '</text>';
      s += '<text class="tz" x="' + (x + W - 12) + '" y="' + (y + 23) + '" text-anchor="end">' + t.zh + '</text>';
      t.columns.forEach(function (c, i) {
        var cy = y + HEAD + i * ROW + ROW / 2;
        var kx = x + 10;
        if (/PK/.test(c.key)) { s += '<rect class="pk" x="' + kx + '" y="' + (cy - 7) + '" width="20" height="14" rx="3"/><text class="pkt" x="' + (kx + 10) + '" y="' + (cy + 3.5) + '" text-anchor="middle">PK</text>'; kx += 24; }
        if (/FK/.test(c.key)) { s += '<rect class="fkb" x="' + (kx + 0.5) + '" y="' + (cy - 6.5) + '" width="19" height="13" rx="3"/><text class="fkt" x="' + (kx + 10) + '" y="' + (cy + 3.5) + '" text-anchor="middle">FK</text>'; kx += 24; }
        var nx = x + 58;
        s += '<text class="cn" x="' + nx + '" y="' + (cy + 4) + '">' + c.name + '</text>';
        s += '<text class="ty" x="' + (x + W - 12) + '" y="' + (cy + 4) + '" text-anchor="end">' + c.type + '</text>';
      });
      s += '</g>';
    });
    s += labels + '</svg>';
    $('#erd').innerHTML = s;
  }

  /* ---------- 2. table browser ---------- */
  function renderTableTabs() {
    var h = '';
    D.TABLES.forEach(function (t) {
      h += '<button class="tab" role="tab" type="button" data-t="' + t.name + '" aria-selected="' + (t.name === state.table) + '"><span class="mono">' + t.name + '</span><small>' + t.zh + '</small></button>';
    });
    $('#tbl-tabs').innerHTML = h;
  }
  function renderTableDetail() {
    var t = D.TABLES.filter(function (x) { return x.name === state.table; })[0];
    var spec = '<div class="panel"><h3><span class="mono">' + t.name + '</span>　' + t.zh + '</h3><p class="purpose">' + esc(t.purpose) + '</p>';
    spec += '<div class="dt-scroll"><table class="dt"><thead><tr><th>欄位</th><th>型別</th><th>鍵</th><th>說明</th></tr></thead><tbody>';
    t.columns.forEach(function (c) {
      var keys = (c.key ? c.key.split(', ') : []).map(function (k) { return '<span class="key ' + k.toLowerCase() + '">' + k + '</span>'; }).join(' ');
      spec += '<tr><td class="id">' + c.name + '</td><td class="id">' + c.type + '</td><td>' + keys + '</td><td class="wrap">' + esc(c.desc) + (c.ref ? '<br><span class="null">→ ' + c.ref + '</span>' : '') + '</td></tr>';
    });
    spec += '</tbody></table></div></div>';
    var data = '<div class="panel"><h3>樣本資料</h3>';
    if (SQL) {
      var r = run('SELECT * FROM ' + t.name + ';');
      data += '<p class="purpose">共 ' + r.values.length + ' 列　<code>SELECT * FROM ' + t.name + ';</code></p>' + tableHtml(r);
    } else {
      data += '<p class="purpose">SQLite 載入後顯示。</p>';
    }
    data += '</div>';
    $('#tbl-detail').innerHTML = spec + data;
  }

  /* ---------- 3. query bench ---------- */
  function renderQList() {
    var h = '';
    D.QUERIES.forEach(function (q, i) {
      h += '<button class="qitem" type="button" role="listitem" data-q="' + q.id + '" aria-current="' + (q === state.q) + '"><span class="qn">Q' + (i + 1) + '</span><span class="qt">' + esc(q.title) + '</span><span class="tp">' + q.topic + '</span></button>';
    });
    $('#qlist').innerHTML = h;
    document.querySelectorAll('.qlinks').forEach(function (el) {
      el.innerHTML = el.getAttribute('data-q').split(',').map(function (id) {
        var q = qById(id);
        return '<button class="qlink" type="button" data-q="' + id + '" title="' + esc(q.title) + '">' + qNum(q) + ' ' + esc(q.title) + '</button>';
      }).join('');
    });
  }
  function selectQuery(q, scroll) {
    state.q = q; state.variant = 0;
    document.querySelectorAll('.qitem').forEach(function (b) { b.setAttribute('aria-current', String(b.dataset.q === q.id)); });
    $('#q-topic').textContent = qNum(q) + ' · ' + q.topic;
    $('#q-tables').innerHTML = '用到的表 ' + q.tables.map(function (t) { return '<span class="chip">' + t + '</span>'; }).join(' ');
    $('#q-title').textContent = q.title;
    $('#q-who').textContent = '情境：' + q.who;
    $('#q-steps').innerHTML = q.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    $('#sql-input').value = q.sql;
    renderExpected();
    if (SQL) runUser(); else { $('#act-out').innerHTML = '<div class="empty">尚未執行。</div>'; }
    renderCompare();
    if (scroll) document.getElementById('query').scrollIntoView();
  }
  function renderExpected() {
    if (!SQL) return;
    state.expected = run(state.q.sql);
    $('#exp-cnt').textContent = countText(state.expected);
    $('#exp-out').innerHTML = resultBlock(state.expected);
  }
  function runUser() {
    var sql = $('#sql-input').value;
    var act = run(sql), exp = state.expected;
    $('#act-cnt').textContent = countText(act);
    var badge = '', note = '', opt = {};
    if (act.error !== undefined) {
      badge = '<span class="badge bad">錯誤</span>';
    } else if (act.noRows) {
      badge = '<span class="badge warn">沒有回傳資料</span>';
    } else {
      var d = diffRows(exp, act);
      var colsOk = sameCols(exp, act);
      var sameSet = !d.extraInB.length && !d.missingInB.length;
      var sameOrder = sameSet && keyOf(exp.values) === keyOf(act.values);
      if (sameSet && colsOk && sameOrder) badge = '<span class="badge ok">與預期相同</span>';
      else if (sameSet && colsOk) { badge = '<span class="badge warn">資料相同，順序不同</span>'; note = '每一列都對，但排列順序不同。檢查 ORDER BY。'; }
      else {
        badge = '<span class="badge bad">與預期不同</span>';
        var parts = [];
        if (!colsOk) parts.push('欄位不同（預期：' + exp.columns.join('、') + '）');
        if (d.extraInB.length) parts.push('多了 ' + d.extraInB.length + ' 列（綠色 +）');
        if (d.missingInB.length) parts.push('少了 ' + d.missingInB.length + ' 列（紅色 −，附在表格最後）');
        note = parts.join('；') + '。';
        var mark = {}; d.extraInB.forEach(function (i) { mark[i] = 'plus'; });
        opt = { marks: true, mark: mark, missingRows: colsOk ? d.missingInB.map(function (i) { return exp.values[i]; }) : [] };
      }
    }
    $('#act-badge').innerHTML = badge;
    $('#act-out').innerHTML = resultBlock(act, opt) + (note ? '<p class="diffnote" style="margin-top:8px">' + esc(note) + '</p>' : '');
  }

  /* ---------- 4. compare ---------- */
  function renderCompare() {
    var q = state.q;
    $('#cmp-q').textContent = qNum(q) + '　' + q.title;
    $('#var-tabs').innerHTML = q.variants.map(function (v, i) {
      return '<button class="tab" role="tab" type="button" data-v="' + i + '" aria-selected="' + (i === state.variant) + '">修改 ' + (i + 1) + '：' + esc(v.label) + '</button>';
    }).join('');
    var v = q.variants[state.variant];
    var diff = lineDiff(q.sql, v.sql).map(function (p) { return '<span class="ln ' + p[0] + '">' + hl(p[1]) + '</span>'; }).join('');
    var h = '<div class="explain">' +
      '<div><span class="label">改了什麼</span><p>' + esc(v.change) + '</p></div>' +
      '<div class="effect"><span class="label">結果怎麼變</span><p>' + esc(v.effect) + '</p></div>' +
      '<div><span class="label">為什麼</span><p>' + esc(v.why) + '</p></div></div>';
    h += '<div><span class="label">SQL 差異（+ 新增、− 刪除）</span><div class="codeview" style="margin-top:6px">' + diff + '</div></div>';
    if (SQL) {
      var a = state.expected || run(q.sql), b = run(v.sql);
      var sum = '', optA = {}, optB = {};
      if (b.error !== undefined) {
        sum = '<span>原本 ' + a.values.length + ' 列</span><span class="arrow">→</span><span class="badge bad">修改後執行失敗</span>';
      } else {
        var d = diffRows(a, b);
        var mA = {}, mB = {};
        d.missingInB.forEach(function (i) { mA[i] = 'minus'; });
        d.extraInB.forEach(function (i) { mB[i] = 'plus'; });
        optA = { marks: true, mark: mA }; optB = { marks: true, mark: mB };
        sum = '<span>原本 <b>' + a.values.length + '</b> 列</span><span class="arrow">→</span><span>修改後 <b>' + b.values.length + '</b> 列</span>';
        if (!d.extraInB.length && !d.missingInB.length) sum += '<span class="badge ok">資料完全相同</span>';
        if (d.extraInB.length) sum += '<span class="badge ok">+ ' + d.extraInB.length + ' 列</span>';
        if (d.missingInB.length) sum += '<span class="badge bad">− ' + d.missingInB.length + ' 列</span>';
        if (d.extraInB.length && d.missingInB.length) sum += '<span class="diffnote">數值改變的列，會以「舊的 −」和「新的 +」各出現一次</span>';
      }
      h += '<div class="cmp-sum">' + sum + '</div>';
      h += '<div class="results"><div class="res"><div class="res-head"><h3>原 SQL 結果</h3><span class="cnt">' + countText(a) + '</span></div>' + resultBlock(a, optA) + '</div>' +
        '<div class="res"><div class="res-head"><h3>修改後結果</h3><span class="cnt">' + countText(b) + '</span></div>' + resultBlock(b, optB) + '</div></div>';
    }
    h += '<div class="cmp-actions"><button class="btn primary" type="button" id="btn-try">把修改版放進編輯器</button><small>放進第 3 節的編輯器後，可以再自己改改看。</small></div>';
    $('#cmp-card').innerHTML = h;
  }

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.classList.contains('qitem') || b.classList.contains('qlink')) { selectQuery(qById(b.dataset.q), b.classList.contains('qlink')); return; }
    if (b.dataset.t) { state.table = b.dataset.t; renderTableTabs(); renderTableDetail(); return; }
    if (b.dataset.v !== undefined) { state.variant = +b.dataset.v; renderCompare(); return; }
    if (b.id === 'btn-run') { runUser(); return; }
    if (b.id === 'btn-reset') { $('#sql-input').value = state.q.sql; if (SQL) runUser(); return; }
    if (b.id === 'btn-try') {
      $('#sql-input').value = state.q.variants[state.variant].sql;
      if (SQL) runUser();
      document.querySelector('.editor').scrollIntoView({ block: 'start' });
      $('#sql-input').focus({ preventScroll: true });
    }
  });
  $('#sql-input').addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); if (SQL) runUser(); }
    else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      var t = e.target, s = t.selectionStart;
      t.setRangeText('  ', s, t.selectionEnd, 'end');
    }
  });

  /* ---------- boot ---------- */
  renderTimetableSkeleton();
  renderERD();
  renderTableTabs();
  renderTableDetail();
  renderQList();
  selectQuery(state.q, false);

  function fail(msg) {
    $('#status').classList.add('fail');
    $('#status-text').textContent = msg;
  }
  if (typeof initSqlJs !== 'function') { fail('SQLite 無法載入，請檢查網路後重新整理'); return; }
  initSqlJs().then(function (S) {
    SQL = S;
    var r = run("SELECT (SELECT COUNT(*) FROM department)+(SELECT COUNT(*) FROM teacher)+(SELECT COUNT(*) FROM student)+(SELECT COUNT(*) FROM course)+(SELECT COUNT(*) FROM course_time)+(SELECT COUNT(*) FROM enrollment)");
    $('#status').classList.add('ready');
    $('#status-text').textContent = 'SQLite 就緒 · 6 張表 · ' + r.values[0][0] + ' 筆資料';
    $('#btn-run').disabled = false;
    renderTimetable();
    renderTableDetail();
    selectQuery(state.q, false);
  }).catch(function (e) { fail('SQLite 初始化失敗：' + e.message); });
})();
