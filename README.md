# ASCII Hachiware

把《ちいかわ》ひとりごつ 片段轉成字元動畫，配原曲播放。

## 直接看

雙擊 `ASCII-Hachiware.html`（單一檔案，資料、渲染器、音樂全部內嵌）。
開啟後自動無限循環播放字元動畫與原曲音樂，無額外進度條、提示按鈕或暫停介面。

## 檔案

- `index.html` + `app.js` + `renderer.js` + `styles.css` + `ascii_data.js`：開發用的播放器（要用伺服器開，見下）。
- `ascii_data.js`：預先算好的全片字元影格（由 `tools/build.html` 產生，不要手改）。
- `tools/server.js`：本機伺服器（支援影片 seek，並讓產生器能存檔）。
- `tools/build.html`：在瀏覽器裡把原片轉成 `ascii_data.js`。
- `tools/bundle.js`：打包成單一 `ASCII-Hachiware.html`。
- `Screen_Recording_…Instagram.mp4`：IG 參考片。
- `scenes.js`、`shader.js`、`audio.js`、`code-data.js`：Gemini 舊版的殘留，目前沒有被引用。

## 重新產生

```
node tools/server.js
```

開 http://127.0.0.1:8766/tools/build.html → 「預覽」挑幾個時間點看效果 → 「產生全片並存檔」（已改為預載 Blob 連續播放擷取、中間不再重複 seek，約 3 分鐘完成且無 35.7s / 61.1s 停格）→

```
node tools/bundle.js
```

## 演算法重點（tools/build.html）

1. 每個像素依顏色分成：墨線、白、頭髮藍、腮紅、木頭、草叢。
2. 這支影片的毛色和背景紙色幾乎一樣（約 237,240,241），顏色分不開，改用拓樸判斷：白色區塊侵蝕 3 步切斷細小漏縫後標號，「沒碰到畫面邊緣（被墨線包住）」或「碰到腮紅」的算毛，其餘算紙。紙留黑。
3. 每個字格 3×5 像素，墨線多的格子留空；角色格依離輪廓的距離做假立體光影，決定用哪個字元（邊緣淡、中心濃）。草叢只用細字元。
4. 同一個鏡頭內，畫面沒動的格子做緩動與遲滯，減少壓縮雜訊造成的閃爍；偵測到換鏡就重設。
5. 每個鏡頭各自取 4:3 視窗，置中在角色（頭髮、腮紅、毛）上。
6. 輸出逐格差分後 deflate 壓縮。
