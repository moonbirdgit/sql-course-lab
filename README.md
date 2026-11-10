# 選課與課表資料庫 · SQL 練習

大學選課系統的 SQL 練習頁面，所有查詢都用瀏覽器裡的 SQLite（sql.js）執行。

1. **案例背景**：資料庫給學生、教師、系辦使用，用來查課表、找衝堂、統計學分與成績登錄進度。
2. **資料庫設計**：6 張表（department、teacher、student、course、course_time、enrollment）的 ERD、欄位說明與樣本資料。
3. **查詢操作**：9 題查詢，可以修改 SQL、執行，並和預期結果比對。
4. **結果比較**：每題附修改版本，說明結果怎麼變、為什麼。

## 檔案

- `index.html`：可直接部署的單一頁面
- `src/data.js`：建表 SQL、樣本資料、查詢題目與說明
- `src/app.js`：頁面互動邏輯
- `src/page.html`：版面與樣式

## 本機預覽

直接用瀏覽器開啟 `index.html` 即可（需要網路載入 sql.js）。
