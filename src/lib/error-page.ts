export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>Phsar Ichiba</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fbf7ec; color: #26301f; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #5b6653; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1.25rem; border-radius: 999px; font: inherit; font-weight: 600; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #3b7d20; color: #fff; }
      .secondary { background: transparent; color: #26301f; border-color: #dcf0c4; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>ページを読み込めませんでした</h1>
      <p>問題が発生しました。もう一度お試しいただくか、トップページにお戻りください。</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">再読み込み</button>
        <a class="secondary" href="/">トップへ戻る</a>
      </div>
    </div>
  </body>
</html>`;
}
