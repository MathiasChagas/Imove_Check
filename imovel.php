<?php
require_once __DIR__ . '/api/auth.php';
if (!current_user($pdo)) { header('Location: login.php'); exit; }
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Imóvel | ImoveCheck</title>
  <link rel="stylesheet" href="assets/css/style.css">
  <script src="assets/js/app.js" defer></script>
  <script src="assets/js/imovel.js" defer></script>
</head>
<body data-page="imovel">
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
        <a class="back-link" href="index.php" aria-label="Voltar">←</a>
        <div>
          <h1 id="im-endereco">Carregando...</h1>
          <p class="muted">Proprietário: <strong id="im-prop">—</strong> | Inquilino: <strong id="im-inq">—</strong></p>
        </div>
      </div>
      <a class="button secondary" id="btn-editar" href="#">✎ Editar</a>
    </div>

    <div id="feedback" class="feedback" role="alert"></div>

    <section class="card">
      <h2>Iniciar Nova Vistoria</h2>
      <div class="actions-row">
        <button class="button success" type="button" data-novo="entrada">＋ Vistoria de Entrada</button>
        <button class="button warning" type="button" data-novo="saida">＋ Vistoria de Saída</button>
      </div>
    </section>

    <section class="card" id="card-fotos" hidden>
      <h2>Fotos Gerais</h2>
      <div class="gallery" id="im-fotos"></div>
    </section>

    <section class="card">
      <h2>📋 Histórico de Vistorias (<span id="hist-count">0</span>)</h2>
      <div id="historico"><p class="muted">Carregando...</p></div>
    </section>
  </main>
</body>
</html>