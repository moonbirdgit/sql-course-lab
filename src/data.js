var APP_DATA = (function () {
  var SEED_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE department (
  dept_id    TEXT PRIMARY KEY,
  dept_name  TEXT NOT NULL UNIQUE,
  building   TEXT NOT NULL
);

CREATE TABLE teacher (
  teacher_id TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  dept_id    TEXT NOT NULL REFERENCES department(dept_id),
  title      TEXT NOT NULL
);

CREATE TABLE student (
  student_id TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  dept_id    TEXT NOT NULL REFERENCES department(dept_id),
  grade      INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 4)
);

CREATE TABLE course (
  course_id   TEXT PRIMARY KEY,
  course_name TEXT NOT NULL,
  credits     INTEGER NOT NULL CHECK (credits BETWEEN 1 AND 4),
  course_type TEXT NOT NULL CHECK (course_type IN ('必修','選修','通識')),
  dept_id     TEXT NOT NULL REFERENCES department(dept_id),
  teacher_id  TEXT NOT NULL REFERENCES teacher(teacher_id)
);

CREATE TABLE course_time (
  course_id    TEXT NOT NULL REFERENCES course(course_id),
  weekday      INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 5),
  start_period INTEGER NOT NULL,
  end_period   INTEGER NOT NULL,
  room         TEXT NOT NULL,
  PRIMARY KEY (course_id, weekday, start_period),
  CHECK (start_period <= end_period)
);

CREATE TABLE enrollment (
  student_id TEXT NOT NULL REFERENCES student(student_id),
  course_id  TEXT NOT NULL REFERENCES course(course_id),
  score      INTEGER CHECK (score BETWEEN 0 AND 100),
  PRIMARY KEY (student_id, course_id)
);

INSERT INTO department VALUES
 ('CS','資訊工程學系','工程一館'),
 ('EE','電機工程學系','工程二館'),
 ('IM','資訊管理學系','管理大樓'),
 ('GE','通識教育中心','綜合大樓');

INSERT INTO teacher VALUES
 ('T01','林志明','CS','教授'),
 ('T02','陳雅婷','CS','副教授'),
 ('T03','王建國','EE','教授'),
 ('T04','張淑芬','IM','助理教授'),
 ('T05','李宗翰','GE','講師'),
 ('T06','黃美玲','IM','副教授');

INSERT INTO student VALUES
 ('B112001','劉建宏','CS',3),
 ('B112002','蔡宜蓁','EE',3),
 ('B113001','王小明','CS',2),
 ('B113002','李佳穎','CS',2),
 ('B113003','張家豪','EE',2),
 ('B113004','陳怡君','IM',2),
 ('B113005','鄭宇翔','CS',2),
 ('B114001','林冠宇','CS',1),
 ('B114002','黃詩涵','EE',1),
 ('B114003','吳承恩','IM',1);

INSERT INTO course VALUES
 ('C101','資料庫系統',3,'必修','CS','T01'),
 ('C102','資料結構',3,'必修','CS','T02'),
 ('C103','計算機組織',3,'必修','CS','T02'),
 ('C104','人工智慧導論',2,'選修','CS','T02'),
 ('E201','電路學',3,'必修','EE','T03'),
 ('E202','數位邏輯',3,'選修','EE','T03'),
 ('M301','系統分析與設計',3,'必修','IM','T04'),
 ('M302','網頁程式設計',2,'選修','IM','T04'),
 ('G401','英文閱讀與寫作',2,'通識','GE','T05'),
 ('G402','生活中的統計',2,'通識','GE','T05');

INSERT INTO course_time VALUES
 ('C101',1,2,4,'EC101'),
 ('C102',2,2,3,'EC102'),
 ('C102',4,2,2,'EC102'),
 ('C103',3,5,7,'EC201'),
 ('C104',5,3,4,'EC103'),
 ('E201',2,6,8,'ED201'),
 ('E202',1,3,4,'ED105'),
 ('M301',3,2,4,'MB301'),
 ('M302',4,6,7,'MB204'),
 ('G401',2,2,3,'GA110'),
 ('G402',5,6,7,'GA201');

INSERT INTO enrollment VALUES
 ('B113001','C101',88),
 ('B113001','C102',76),
 ('B113001','E202',82),
 ('B113001','G402',NULL),
 ('B113002','C101',93),
 ('B113002','C102',85),
 ('B113002','C103',NULL),
 ('B113002','G401',90),
 ('B113003','E201',71),
 ('B113003','E202',64),
 ('B113003','C101',NULL),
 ('B113004','M301',87),
 ('B113004','M302',92),
 ('B113004','C101',79),
 ('B114001','C102',58),
 ('B114001','G402',74),
 ('B114002','E201',66),
 ('B114002','G402',80),
 ('B114003','M302',95),
 ('B114003','G401',83),
 ('B112001','C103',81),
 ('B112001','M301',NULL),
 ('B112002','E201',90),
 ('B112002','E202',NULL),
 ('B112002','G402',68);
`;

  var TABLES = [
    {
      name: 'department', zh: '系所',
      purpose: '每個開課或收學生的單位一列。系名只存在這裡，系所改名時只要改一列。',
      columns: [
        { name: 'dept_id', type: 'TEXT', key: 'PK', desc: '系所代碼，例如 CS、EE' },
        { name: 'dept_name', type: 'TEXT', key: '', desc: '系所全名，不可重複' },
        { name: 'building', type: 'TEXT', key: '', desc: '系辦所在大樓' }
      ]
    },
    {
      name: 'teacher', zh: '教師',
      purpose: '每位授課教師一列，記錄他隸屬哪個系所。',
      columns: [
        { name: 'teacher_id', type: 'TEXT', key: 'PK', desc: '教師編號' },
        { name: 'name', type: 'TEXT', key: '', desc: '姓名' },
        { name: 'dept_id', type: 'TEXT', key: 'FK', ref: 'department.dept_id', desc: '隸屬系所' },
        { name: 'title', type: 'TEXT', key: '', desc: '職稱：教授、副教授、助理教授、講師' }
      ]
    },
    {
      name: 'student', zh: '學生',
      purpose: '每位學生一列。學號開頭的 B 加上入學學年度，例如 B113 是 113 學年入學。',
      columns: [
        { name: 'student_id', type: 'TEXT', key: 'PK', desc: '學號' },
        { name: 'name', type: 'TEXT', key: '', desc: '姓名' },
        { name: 'dept_id', type: 'TEXT', key: 'FK', ref: 'department.dept_id', desc: '主修系所' },
        { name: 'grade', type: 'INTEGER', key: '', desc: '年級，限 1–4' }
      ]
    },
    {
      name: 'course', zh: '課程',
      purpose: '本學期開出的每門課一列：幾學分、哪個系開、誰教。',
      columns: [
        { name: 'course_id', type: 'TEXT', key: 'PK', desc: '課號' },
        { name: 'course_name', type: 'TEXT', key: '', desc: '課名' },
        { name: 'credits', type: 'INTEGER', key: '', desc: '學分數，限 1–4' },
        { name: 'course_type', type: 'TEXT', key: '', desc: '必修／選修／通識' },
        { name: 'dept_id', type: 'TEXT', key: 'FK', ref: 'department.dept_id', desc: '開課系所' },
        { name: 'teacher_id', type: 'TEXT', key: 'FK', ref: 'teacher.teacher_id', desc: '授課教師' }
      ]
    },
    {
      name: 'course_time', zh: '上課時段',
      purpose: '一門課每週的每一段上課時間一列。資料結構一週上兩次，所以有兩列。',
      columns: [
        { name: 'course_id', type: 'TEXT', key: 'PK, FK', ref: 'course.course_id', desc: '哪一門課' },
        { name: 'weekday', type: 'INTEGER', key: 'PK', desc: '星期幾，1＝週一 … 5＝週五' },
        { name: 'start_period', type: 'INTEGER', key: 'PK', desc: '開始節次' },
        { name: 'end_period', type: 'INTEGER', key: '', desc: '結束節次，不可小於開始節次' },
        { name: 'room', type: 'TEXT', key: '', desc: '教室代號' }
      ]
    },
    {
      name: 'enrollment', zh: '選課紀錄',
      purpose: '「某位學生選了某門課」一列。學生和課程是多對多，靠這張表連起來。',
      columns: [
        { name: 'student_id', type: 'TEXT', key: 'PK, FK', ref: 'student.student_id', desc: '選課學生' },
        { name: 'course_id', type: 'TEXT', key: 'PK, FK', ref: 'course.course_id', desc: '選的課' },
        { name: 'score', type: 'INTEGER', key: '', desc: '學期成績 0–100；NULL 代表老師還沒登分' }
      ]
    }
  ];

  var QUERIES = [
    {
      id: 'q1', topic: '篩選', title: '列出所有二年級學生',
      who: '系辦要寄二年級導生會議通知，需要名單。',
      tables: ['student'],
      sql:
`SELECT student_id AS 學號, name AS 姓名,
       dept_id AS 系所, grade AS 年級
FROM student
WHERE grade = 2
ORDER BY student_id;`,
      steps: [
        'FROM student：先決定資料從學生表來，共 10 列。',
        'WHERE grade = 2：逐列檢查年級，只留下等於 2 的列，剩 5 列。',
        'SELECT … AS …：只挑出要顯示的四個欄位，並改成中文欄名。',
        'ORDER BY student_id：依學號排序。沒寫 ORDER BY 時，資料庫不保證每次順序一樣。'
      ],
      variants: [
        {
          label: '把 = 改成 >=',
          sql:
`SELECT student_id AS 學號, name AS 姓名,
       dept_id AS 系所, grade AS 年級
FROM student
WHERE grade >= 2
ORDER BY student_id;`,
          change: 'WHERE grade = 2 改成 WHERE grade >= 2。',
          effect: '從 5 列變成 7 列，多了三年級的劉建宏和蔡宜蓁，而且排在最前面。',
          why: '>= 是「大於或等於」，三年級的 3 也符合條件。兩人的學號 B112 開頭比 B113 小，所以排序後在前面。'
        }
      ]
    },
    {
      id: 'q2', topic: '篩選', title: '資工系或電機系的二年級學生',
      who: '工學院要統計院內兩個系的二年級人數。',
      tables: ['student'],
      sql:
`SELECT student_id AS 學號, name AS 姓名,
       dept_id AS 系所, grade AS 年級
FROM student
WHERE (dept_id = 'CS' OR dept_id = 'EE')
  AND grade = 2
ORDER BY student_id;`,
      steps: [
        '條件要表達的是「系所是 CS 或 EE」而且「年級是 2」。',
        '括號先算：(dept_id = \'CS\' OR dept_id = \'EE\') 留下兩系共 8 人。',
        '再套 AND grade = 2：8 人中只剩二年級的 4 人。'
      ],
      variants: [
        {
          label: '拿掉括號',
          sql:
`SELECT student_id AS 學號, name AS 姓名,
       dept_id AS 系所, grade AS 年級
FROM student
WHERE dept_id = 'CS' OR dept_id = 'EE'
  AND grade = 2
ORDER BY student_id;`,
          change: '把 (dept_id = \'CS\' OR dept_id = \'EE\') 外面的括號拿掉。',
          effect: '從 4 列變成 6 列：資工系三年級的劉建宏、一年級的林冠宇也跑出來了。',
          why: 'SQL 裡 AND 比 OR 先算，就像乘法比加法先算。沒有括號時，資料庫讀成 dept_id = \'CS\' OR (dept_id = \'EE\' AND grade = 2)，意思變成「資工系所有年級」加上「電機系二年級」。'
        },
        {
          label: '改用 IN',
          sql:
`SELECT student_id AS 學號, name AS 姓名,
       dept_id AS 系所, grade AS 年級
FROM student
WHERE dept_id IN ('CS', 'EE')
  AND grade = 2
ORDER BY student_id;`,
          change: '用 dept_id IN (\'CS\', \'EE\') 取代兩個 OR。',
          effect: '結果完全一樣，還是 4 列。',
          why: 'IN 本身就是「等於清單裡任一個」，是一個完整的條件，不會和 AND 搶優先順序，所以不用加括號。寫法不同但意思相同，結果也就相同。'
        }
      ]
    },
    {
      id: 'q3', topic: '連結', title: '資工系學生各選了哪些課',
      who: '資工系辦在加退選後確認每位學生的選課狀況。',
      tables: ['student', 'enrollment', 'course'],
      sql:
`SELECT s.student_id AS 學號, s.name AS 姓名,
       c.course_name AS 課程, c.credits AS 學分
FROM student AS s
JOIN enrollment AS e ON e.student_id = s.student_id
JOIN course AS c ON c.course_id = e.course_id
WHERE s.dept_id = 'CS'
ORDER BY s.student_id, c.course_id;`,
      steps: [
        'enrollment 是學生和課程中間的橋，一列代表「某學生選了某門課」。',
        '第一個 JOIN 用學號把 student 接上 enrollment：王小明會接到 4 列選課紀錄。',
        '第二個 JOIN 用課號把 enrollment 接上 course，把 C101 換成「資料庫系統」和它的學分。',
        'JOIN（也就是 INNER JOIN）只保留兩邊都配得上的列。鄭宇翔沒有選課紀錄，所以不會出現。'
      ],
      variants: [
        {
          label: '兩個 JOIN 都改 LEFT JOIN',
          sql:
`SELECT s.student_id AS 學號, s.name AS 姓名,
       c.course_name AS 課程, c.credits AS 學分
FROM student AS s
LEFT JOIN enrollment AS e ON e.student_id = s.student_id
LEFT JOIN course AS c ON c.course_id = e.course_id
WHERE s.dept_id = 'CS'
ORDER BY s.student_id, c.course_id;`,
          change: '兩個 JOIN 都改成 LEFT JOIN。',
          effect: '從 12 列變成 13 列，多了一列鄭宇翔，課程和學分是 NULL。',
          why: 'LEFT JOIN 會保留左邊表的每一列。鄭宇翔在 enrollment 找不到配對，資料庫仍保留他，右邊欄位用 NULL 補上。這樣系辦才看得到「還沒選課的人」。'
        },
        {
          label: '只改第一個',
          sql:
`SELECT s.student_id AS 學號, s.name AS 姓名,
       c.course_name AS 課程, c.credits AS 學分
FROM student AS s
LEFT JOIN enrollment AS e ON e.student_id = s.student_id
JOIN course AS c ON c.course_id = e.course_id
WHERE s.dept_id = 'CS'
ORDER BY s.student_id, c.course_id;`,
          change: '只有第一個改成 LEFT JOIN，第二個還是 JOIN。',
          effect: '結果和原本一樣是 12 列，鄭宇翔還是沒出現。',
          why: '第一步確實保留了鄭宇翔，但他那列的 e.course_id 是 NULL。第二個 JOIN 要求 c.course_id = NULL，NULL 和任何值比較都不成立，所以這列又被丟掉。要保留到最後，後面每個 JOIN 都得是 LEFT JOIN。'
        }
      ]
    },
    {
      id: 'q4', topic: '彙總', title: '每位老師本學期開幾門課',
      who: '系主任排下學期課務，要看每位老師目前的開課數，沒開課的也要列出來。',
      tables: ['teacher', 'course'],
      sql:
`SELECT t.teacher_id AS 教師編號, t.name AS 教師,
       t.title AS 職稱,
       COUNT(c.course_id) AS 開課數
FROM teacher AS t
LEFT JOIN course AS c ON c.teacher_id = t.teacher_id
GROUP BY t.teacher_id, t.name, t.title
ORDER BY 開課數 DESC, t.teacher_id;`,
      steps: [
        'LEFT JOIN 讓每位老師都留下來。黃美玲本學期沒開課，她那列的課程欄位會是 NULL。',
        'GROUP BY 把同一位老師的列收成一組，例如陳雅婷有 C102、C103、C104 三列，收成一組。',
        'COUNT(c.course_id) 只數「不是 NULL 的課號」，所以陳雅婷是 3，黃美玲是 0。'
      ],
      variants: [
        {
          label: 'COUNT(*)',
          sql:
`SELECT t.teacher_id AS 教師編號, t.name AS 教師,
       t.title AS 職稱,
       COUNT(*) AS 開課數
FROM teacher AS t
LEFT JOIN course AS c ON c.teacher_id = t.teacher_id
GROUP BY t.teacher_id, t.name, t.title
ORDER BY 開課數 DESC, t.teacher_id;`,
          change: 'COUNT(c.course_id) 改成 COUNT(*)。',
          effect: '黃美玲從 0 門變成 1 門，其他人不變。',
          why: 'LEFT JOIN 幫黃美玲補了一列「課程全是 NULL」的資料。COUNT(*) 數的是列數，這一列也算進去；COUNT(c.course_id) 數的是有值的課號，NULL 不算。所以要數「有幾門課」時，應該數課號。'
        },
        {
          label: '改成 JOIN',
          sql:
`SELECT t.teacher_id AS 教師編號, t.name AS 教師,
       t.title AS 職稱,
       COUNT(c.course_id) AS 開課數
FROM teacher AS t
JOIN course AS c ON c.teacher_id = t.teacher_id
GROUP BY t.teacher_id, t.name, t.title
ORDER BY 開課數 DESC, t.teacher_id;`,
          change: 'LEFT JOIN 改成 JOIN。',
          effect: '從 6 列變成 5 列，黃美玲整列消失。',
          why: 'JOIN 只留兩邊都配得上的列。黃美玲在 course 找不到自己的教師編號，連分組的機會都沒有，所以不會出現「0 門」，而是直接不見。題目要求「沒開課的也要列出」，因此要用 LEFT JOIN。'
        }
      ]
    },
    {
      id: 'q5', topic: '彙總', title: '每門課的修課人數與平均成績',
      who: '教務處在期末檢查各課的成績登錄進度。',
      tables: ['course', 'enrollment'],
      sql:
`SELECT c.course_id AS 課號, c.course_name AS 課程,
       COUNT(e.student_id) AS 修課人數,
       COUNT(e.score) AS 已登分,
       ROUND(AVG(e.score), 1) AS 平均成績
FROM course AS c
LEFT JOIN enrollment AS e ON e.course_id = c.course_id
GROUP BY c.course_id, c.course_name
ORDER BY c.course_id;`,
      steps: [
        'score 是 NULL 表示老師還沒登分，不是考 0 分。',
        '以 C101 為例：4 位學生，成績是 88、93、NULL、79。',
        'COUNT(e.student_id) = 4，COUNT(e.score) = 3，因為 COUNT(欄位) 會跳過 NULL。',
        'AVG 也跳過 NULL：(88 + 93 + 79) ÷ 3 = 86.67，ROUND 到小數一位是 86.7。',
        'C104 沒人選，LEFT JOIN 仍保留它，人數 0、平均是 NULL。'
      ],
      variants: [
        {
          label: '把 NULL 當 0',
          sql:
`SELECT c.course_id AS 課號, c.course_name AS 課程,
       COUNT(e.student_id) AS 修課人數,
       COUNT(e.score) AS 已登分,
       ROUND(AVG(COALESCE(e.score, 0)), 1) AS 平均成績
FROM course AS c
LEFT JOIN enrollment AS e ON e.course_id = c.course_id
GROUP BY c.course_id, c.course_name
ORDER BY c.course_id;`,
          change: 'AVG(e.score) 改成 AVG(COALESCE(e.score, 0))。',
          effect: '有未登分學生的課，平均都下降。C101 從 86.7 掉到 65.0；沒人選的 C104 從 NULL 變成 0.0。',
          why: 'COALESCE(e.score, 0) 會把 NULL 換成 0，於是 AVG 不再跳過它。C101 變成 (88 + 93 + 0 + 79) ÷ 4 = 65.0。這等於把「還沒登分」當成「考 0 分」，平均就失真了。'
        }
      ]
    },
    {
      id: 'q6', topic: '彙總', title: '本學期選了 8 學分以上的學生',
      who: '註冊組要找出已選滿 8 學分（含）的學生。',
      tables: ['student', 'enrollment', 'course'],
      sql:
`SELECT s.student_id AS 學號, s.name AS 姓名,
       SUM(c.credits) AS 總學分,
       COUNT(*) AS 課程數
FROM student AS s
JOIN enrollment AS e ON e.student_id = s.student_id
JOIN course AS c ON c.course_id = e.course_id
GROUP BY s.student_id, s.name
HAVING SUM(c.credits) >= 8
ORDER BY 總學分 DESC, s.student_id;`,
      steps: [
        '先 JOIN 出每一筆「學生＋課程＋學分」。',
        'GROUP BY 學生，SUM 加總學分。王小明：3 + 3 + 3 + 2 = 11。',
        'HAVING 在分組「之後」才篩選，只留總學分 ≥ 8 的組。',
        '執行順序可以記成：FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY。'
      ],
      variants: [
        {
          label: '把條件寫進 WHERE',
          sql:
`SELECT s.student_id AS 學號, s.name AS 姓名,
       SUM(c.credits) AS 總學分,
       COUNT(*) AS 課程數
FROM student AS s
JOIN enrollment AS e ON e.student_id = s.student_id
JOIN course AS c ON c.course_id = e.course_id
WHERE SUM(c.credits) >= 8
GROUP BY s.student_id, s.name
ORDER BY 總學分 DESC, s.student_id;`,
          change: '把 HAVING SUM(c.credits) >= 8 移到 WHERE。',
          effect: '沒有結果，SQLite 回傳錯誤 misuse of aggregate: SUM()。',
          why: 'WHERE 是在分組之前一列一列檢查，那時每列只有單一門課的學分，還沒有「總學分」可以比。加總後的條件只能放在 HAVING。'
        },
        {
          label: 'WHERE 先濾掉 2 學分課',
          sql:
`SELECT s.student_id AS 學號, s.name AS 姓名,
       SUM(c.credits) AS 總學分,
       COUNT(*) AS 課程數
FROM student AS s
JOIN enrollment AS e ON e.student_id = s.student_id
JOIN course AS c ON c.course_id = e.course_id
WHERE c.credits >= 3
GROUP BY s.student_id, s.name
HAVING SUM(c.credits) >= 8
ORDER BY 總學分 DESC, s.student_id;`,
          change: '加上 WHERE c.credits >= 3。',
          effect: '從 5 人剩 3 人。王小明、李佳穎的總學分從 11 變 9；陳怡君、蔡宜蓁掉到 6 學分，被 HAVING 刷掉。',
          why: 'WHERE 在加總之前就把 2 學分的課拿掉了，加總時少算這些課，總學分跟著變少。這說明 WHERE 改變的是「拿去加總的資料」，HAVING 改變的是「加總後留下哪些組」。'
        }
      ]
    },
    {
      id: 'q7', topic: '子查詢', title: '成績高於該課平均的學生',
      who: '老師想表揚表現比同班平均好的學生。',
      tables: ['enrollment', 'student', 'course'],
      sql:
`SELECT c.course_name AS 課程, s.name AS 姓名,
       e.score AS 成績
FROM enrollment AS e
JOIN student AS s ON s.student_id = e.student_id
JOIN course AS c ON c.course_id = e.course_id
WHERE e.score > (
  SELECT AVG(e2.score)
  FROM enrollment AS e2
  WHERE e2.course_id = e.course_id
)
ORDER BY c.course_id, e.score DESC;`,
      steps: [
        '括號裡是子查詢。它用到外面的 e.course_id，所以每檢查一列，就照那一列的課號重算一次平均（相關子查詢）。',
        '檢查王小明的 C101 時，子查詢算 C101 的平均 86.67；88 > 86.67，留下。',
        '檢查陳怡君的 C101 時，79 < 86.67，不留。',
        '成績是 NULL 的列，NULL > 任何數都不成立，自然不會出現。'
      ],
      variants: [
        {
          label: '拿掉子查詢的 WHERE',
          sql:
`SELECT c.course_name AS 課程, s.name AS 姓名,
       e.score AS 成績
FROM enrollment AS e
JOIN student AS s ON s.student_id = e.student_id
JOIN course AS c ON c.course_id = e.course_id
WHERE e.score > (
  SELECT AVG(e2.score)
  FROM enrollment AS e2
)
ORDER BY c.course_id, e.score DESC;`,
          change: '刪掉子查詢裡的 WHERE e2.course_id = e.course_id。',
          effect: '從 9 列變成 11 列。多了 4 列：劉建宏 81、吳承恩英文 83、陳怡君 87 和 92；少了 2 列：王小明資料結構 76、黃詩涵 80。',
          why: '少了這個條件，子查詢不再看外面是哪門課，每次都算出同一個數字：全部已登分成績的平均 80.1。原本是「跟同班比」，現在變成「跟全校比」。資料結構班平均只有 73，王小明的 76 原本贏同班，卻輸給 80.1；系統分析與設計只有陳怡君一人有成績，她的 87 等於班平均、原本不算「高於」，現在高於 80.1 就入選了。'
        }
      ]
    },
    {
      id: 'q8', topic: '連結', title: '找出衝堂的選課',
      who: '選課系統在加退選截止前，提醒選到衝堂課的學生。',
      tables: ['enrollment', 'course_time', 'student', 'course'],
      sql:
`SELECT s.name AS 姓名,
       c1.course_name AS 課程A, c2.course_name AS 課程B,
       t1.weekday AS 星期,
       MAX(t1.start_period, t2.start_period) AS 重疊起節,
       MIN(t1.end_period, t2.end_period) AS 重疊迄節
FROM enrollment AS e1
JOIN enrollment AS e2
  ON e2.student_id = e1.student_id
 AND e1.course_id < e2.course_id
JOIN course_time AS t1 ON t1.course_id = e1.course_id
JOIN course_time AS t2 ON t2.course_id = e2.course_id
JOIN student AS s ON s.student_id = e1.student_id
JOIN course AS c1 ON c1.course_id = e1.course_id
JOIN course AS c2 ON c2.course_id = e2.course_id
WHERE t1.weekday = t2.weekday
  AND t1.start_period <= t2.end_period
  AND t2.start_period <= t1.end_period
ORDER BY s.student_id, t1.weekday;`,
      steps: [
        'enrollment 和自己 JOIN（自我連結），把同一位學生的兩門課配成一對。',
        'e1.course_id < e2.course_id 讓每對課只出現一次，也排除「自己配自己」。',
        '再各自接上 course_time，比較兩門課的上課時段。',
        '兩段時間重疊的條件：A 開始 ≤ B 結束，而且 B 開始 ≤ A 結束。',
        '代數字：資料庫系統週一第 2–4 節，數位邏輯週一第 3–4 節。2 ≤ 4 成立、3 ≤ 4 成立，所以重疊，重疊範圍是第 3–4 節。'
      ],
      variants: [
        {
          label: '< 改成 <>',
          sql:
`SELECT s.name AS 姓名,
       c1.course_name AS 課程A, c2.course_name AS 課程B,
       t1.weekday AS 星期,
       MAX(t1.start_period, t2.start_period) AS 重疊起節,
       MIN(t1.end_period, t2.end_period) AS 重疊迄節
FROM enrollment AS e1
JOIN enrollment AS e2
  ON e2.student_id = e1.student_id
 AND e1.course_id <> e2.course_id
JOIN course_time AS t1 ON t1.course_id = e1.course_id
JOIN course_time AS t2 ON t2.course_id = e2.course_id
JOIN student AS s ON s.student_id = e1.student_id
JOIN course AS c1 ON c1.course_id = e1.course_id
JOIN course AS c2 ON c2.course_id = e2.course_id
WHERE t1.weekday = t2.weekday
  AND t1.start_period <= t2.end_period
  AND t2.start_period <= t1.end_period
ORDER BY s.student_id, t1.weekday;`,
          change: 'e1.course_id < e2.course_id 改成 e1.course_id <> e2.course_id。',
          effect: '從 3 列變成 6 列，每個衝堂都出現兩次，課程A 和課程B 對調。',
          why: '<> 只排除「同一門課」，(資料庫系統, 數位邏輯) 和 (數位邏輯, 資料庫系統) 兩種順序都成立。用 < 時只有課號小的放前面那一種成立，所以每對只算一次。'
        },
        {
          label: '拿掉 < 條件',
          sql:
`SELECT s.name AS 姓名,
       c1.course_name AS 課程A, c2.course_name AS 課程B,
       t1.weekday AS 星期,
       MAX(t1.start_period, t2.start_period) AS 重疊起節,
       MIN(t1.end_period, t2.end_period) AS 重疊迄節
FROM enrollment AS e1
JOIN enrollment AS e2
  ON e2.student_id = e1.student_id
JOIN course_time AS t1 ON t1.course_id = e1.course_id
JOIN course_time AS t2 ON t2.course_id = e2.course_id
JOIN student AS s ON s.student_id = e1.student_id
JOIN course AS c1 ON c1.course_id = e1.course_id
JOIN course AS c2 ON c2.course_id = e2.course_id
WHERE t1.weekday = t2.weekday
  AND t1.start_period <= t2.end_period
  AND t2.start_period <= t1.end_period
ORDER BY s.student_id, t1.weekday;`,
          change: '把 AND e1.course_id < e2.course_id 整個刪掉。',
          effect: '從 3 列暴增到 34 列，每位學生的每段課都「和自己衝堂」，原本的衝堂也各出現兩次。',
          why: '同一門課配自己時，時段完全相同，重疊條件一定成立。這就是為什麼自我連結時一定要排除「同一列配同一列」。'
        }
      ]
    },
    {
      id: 'q9', topic: '連結', title: '王小明的本週課表',
      who: '學生打開「個人課表」頁面時，系統背後執行的查詢。',
      tables: ['enrollment', 'course', 'course_time'],
      sql:
`SELECT CASE t.weekday
         WHEN 1 THEN '一' WHEN 2 THEN '二' WHEN 3 THEN '三'
         WHEN 4 THEN '四' WHEN 5 THEN '五'
       END AS 星期,
       t.start_period || '–' || t.end_period AS 節次,
       c.course_name AS 課程, t.room AS 教室
FROM enrollment AS e
JOIN course AS c ON c.course_id = e.course_id
JOIN course_time AS t ON t.course_id = c.course_id
WHERE e.student_id = 'B113001'
ORDER BY t.weekday, t.start_period;`,
      steps: [
        '從王小明（B113001）的 4 筆選課紀錄出發。',
        '接 course 拿課名，接 course_time 拿每段上課時間。資料結構有兩段，所以會變成兩列。',
        'CASE 把 1–5 換成「一」到「五」，|| 把開始和結束節次接成「2–4」這種字串。',
        '依星期、節次排序，就是一張從週一排到週五的課表。'
      ],
      variants: [
        {
          label: '忘了寫連接條件',
          sql:
`SELECT CASE t.weekday
         WHEN 1 THEN '一' WHEN 2 THEN '二' WHEN 3 THEN '三'
         WHEN 4 THEN '四' WHEN 5 THEN '五'
       END AS 星期,
       t.start_period || '–' || t.end_period AS 節次,
       c.course_name AS 課程, t.room AS 教室
FROM enrollment AS e
JOIN course AS c ON c.course_id = e.course_id,
     course_time AS t
WHERE e.student_id = 'B113001'
ORDER BY t.weekday, t.start_period;`,
          change: 'JOIN course_time … ON … 改成只用逗號列出 course_time，沒有連接條件。',
          effect: '從 5 列暴增到 44 列，課名和時段亂配，例如資料庫系統被排到週三。',
          why: '沒有 ON 條件時，資料庫把王小明的 4 門課和 course_time 全部 11 個時段每個都配一次：4 × 11 = 44，這叫笛卡兒積。連接條件的作用就是只留「時段真的屬於這門課」的配對。'
        }
      ]
    }
  ];

  return { SEED_SQL: SEED_SQL, TABLES: TABLES, QUERIES: QUERIES };
})();
if (typeof module !== 'undefined') module.exports = APP_DATA;
