<?php
require_once __DIR__ . '/api/auth.php';
if (!current_user($pdo)) { header('Location: login.php'); exit; }
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Laudo de Vistoria | ImoveCheck</title>
  <link rel="stylesheet" href="assets/css/style.css">
  <script src="assets/js/app.js" defer></script>
  <script src="assets/js/laudo.js" defer></script>
</head>
<body data-page="laudo">
  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="index.php"><span class="brand-icon">▤</span><strong>ImoveCheck</strong></a>
      <span class="brand-subtitle">Sistema de Inspeção de Imóveis</span>
      <a class="home-link" href="#" id="logout-link">Sair ↗</a>
      <a class="home-link" href="index.php">⌂ <span>Início</span></a>
    </div>
  </header>

  <main class="container">
    <div class="vist-head no-print">
      <div class="back-heading">
        <a class="back-link" id="back-link" href="index.php" aria-label="Voltar">←</a>
        <h1>Laudo de Vistoria</h1>
      </div>
      <button class="button primary" type="button" id="btn-print">🖨 Imprimir / PDF</button>
    </div>

    <div id="feedback" class="feedback" role="alert"></div>
    <article class="laudo" id="laudo"><div class="empty-state">Carregando laudo...</div></article>
  </main>
</body>
</html>