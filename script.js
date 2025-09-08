body {
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
  background: linear-gradient(135deg,#0f2027,#203a43,#2c5364);
  color: #fff;
  text-align: center;
}
.container { padding: 18px; max-width: 720px; margin: 0 auto; }
#coin { width: 150px; cursor: pointer; transition: transform .08s; user-select: none; }
#coin:active { transform: scale(.92); }
#shop, #meme-shop { display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 8px; margin-bottom: 12px; }
button { cursor: pointer; border: none; padding: 10px 12px; border-radius: 8px; font-weight: bold; }
.shop-btn { background: linear-gradient(180deg,#ffd34d,#f0a500); color:#000; }
.token-float { position: absolute; font-size: 20px; color: gold; animation: floatUp 1s ease-out; pointer-events: none; }
@keyframes floatUp { from { opacity: 1; transform: translateY(0);} to { opacity: 0; transform: translateY(-60px);} }
#leaderboard { list-style: none; padding: 0; max-width: 360px; margin: 0 auto; text-align:left; }
#leaderboard li { background: rgba(255,255,255,0.06); margin:6px 0; padding:8px; border-radius:6px; }
.ach-badge { display:inline-block; background: rgba(255,255,255,0.08); padding:4px 8px; margin:4px; border-radius:6px; }
.notes { font-size: 12px; opacity: 0.8; margin-top: 12px; }
