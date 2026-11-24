<?php
require_once __DIR__ . '/api/auth.php';
if (!current_user($pdo)) { header('Location: login.php'); exit; }
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Editar Imóvel | ImoveCheck</title>
  <link rel="stylesheet" href="assets/css/style.css">
  <script src="assets/js/app.js" defer></script>
  <script src="assets/js/imovel.js" defer></script>
</head>
<body data-page="editar">
  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="index.php"><span class="brand-icon">▤</span><strong>ImoveCheck</strong></a>
      <span class="brand-subtitle">Sistema de Inspeção de Imóveis</span>
      <a class="home-link" href="#" id="logout-link">Sair ↗</a>
      <a class="home-link" href="index.php">⌂ <span>Início</span></a>
    </div>
  </header>

  <main class="container form-container">
    <div class="back-heading">
      <a class="back-link" id="back-link" href="index.php" aria-label="Voltar">←</a>
      <h1>Editar Imóvel</h1>
    </div>

    <form id="edit-form" class="form-card" novalidate>
      <div class="field">
        <label for="endereco">Endereço <span class="required">*</span></label>
        <input id="endereco" name="endereco" type="text" maxlength="255" required>
      </div>
      <div class="form-grid">
        <div class="field">
          <label for="proprietario">Proprietário</label>
          <input id="proprietario" name="proprietario" type="text" maxlength="150">
        </div>
        <div class="field">
          <label for="inquilino">Inquilino</label>
          <input id="inquilino" name="inquilino" type="text" maxlength="150">
        </div>
      </div>
      <div id="form-feedback" class="feedback" role="alert"></div>
      <div class="form-actions">
        <button class="button primary" id="save-button" type="submit">▣ Salvar</button>
        <a class="button secondary" id="cancel-link" href="index.php">Cancelar</a>
      </div>
    </form>
  </main>
</body>
</html>