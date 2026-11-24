<?php
require_once __DIR__ . '/api/auth.php';
if (!current_user($pdo)) { header('Location: login.php'); exit; }
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vistoria | ImoveCheck</title>
  <link rel="stylesheet" href="assets/css/style.css">
  <script src="assets/js/app.js" defer></script>
  <script src="assets/js/vistoria.js" defer></script>
</head>
<body data-page="vistoria">
  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="index.php"><span class="brand-icon">▤</span><strong>ImoveCheck</strong></a>
      <span class="brand-subtitle">Sistema de Inspeção de Imóveis</span>
      <a class="home-link" href="#" id="logout-link">Sair ↗</a>
      <a class="home-link" href="index.php">⌂ <span>Início</span></a>
    </div>
  </header>

  <main class="container">
    <div class="vist-head">
      <div class="back-heading">
        <a class="back-link" id="back-link" href="index.php" aria-label="Voltar">←</a>
        <div>
          <div class="vist-title"><span class="badge" id="tipo-badge"></span> <span id="vist-endereco"></span></div>
          <p class="muted" id="vist-data"></p>
        </div>
      </div>
      <button class="button success" type="button" id="btn-concluir-top">✓ Concluir</button>
    </div>

    <div id="feedback" class="feedback" role="alert"></div>

    <section class="card">
      <div class="progress-row"><span>Progresso geral</span><strong id="progress-pct">0%</strong></div>
      <div class="bar big"><span id="progress-bar"></span></div>
    </section>

    <div id="comodos"></div>

    <button type="button" class="add-comodo" id="add-comodo">＋ Adicionar Cômodo</button>

    <section class="card">
      <label class="card-title" for="observacoes">Observações Gerais</label>
      <textarea id="observacoes" rows="4" placeholder="Observações gerais da vistoria..."></textarea>
    </section>

    <section class="card sign-card">
      <h2>Assinatura Digital</h2>
      <div>
        <img id="sign-preview" alt="Assinatura" hidden>
        <button type="button" class="link-btn" id="sign-open">Assinar</button>
      </div>
    </section>

    <button class="button success block" type="button" id="btn-concluir">✓ Concluir Vistoria e Gerar Laudo</button>
  </main>

  <input class="visually-hidden" type="file" id="foto-input" accept="image/jpeg,image/png,image/webp" multiple>

  <dialog id="dlg-item">
    <form id="form-item" class="dlg-form">
      <h2>Adicionar item</h2>
      <label for="item-nome">Nome do item</label>
      <input type="text" id="item-nome" maxlength="100" required>
      <label for="item-tipo">Tipo de avaliação</label>
      <select id="item-tipo">
        <option value="estado">Estado (Excelente / Bom / Regular / Ruim)</option>
        <option value="funcionamento">Funcionamento (Funcionando / Não Funcionando / N/A)</option>
      </select>
      <div class="form-actions">
        <button class="button primary" type="submit">Adicionar</button>
        <button class="button secondary" type="button" data-close>Cancelar</button>
      </div>
    </form>
  </dialog>

  <dialog id="dlg-sign">
    <div class="dlg-form">
      <h2>Assinatura Digital</h2>
      <p class="muted">Desenhe sua assinatura no quadro abaixo.</p>
      <canvas id="sign-canvas" width="600" height="200"></canvas>
      <div class="form-actions">
        <button class="button primary" type="button" id="sign-save">Salvar assinatura</button>
        <button class="button secondary" type="button" id="sign-clear">Limpar</button>
        <button class="button secondary" type="button" data-close>Cancelar</button>
      </div>
    </div>
  </dialog>
</body>
</html>