CREATE DATABASE IF NOT EXISTS imovecheck CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE imovecheck;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS imoveis (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  endereco VARCHAR(255) NOT NULL,
  proprietario VARCHAR(150) NULL,
  inquilino VARCHAR(150) NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_imoveis_usuario (usuario_id),
  CONSTRAINT fk_imoveis_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fotos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  imovel_id INT UNSIGNED NOT NULL,
  caminho VARCHAR(255) NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fotos_imoveis FOREIGN KEY (imovel_id) REFERENCES imoveis(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tokens_acesso (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  last_used_at DATETIME NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token_usuario (usuario_id),
  CONSTRAINT fk_tokens_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tokens_recuperacao (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recuperacao_usuario (usuario_id),
  CONSTRAINT fk_recuperacao_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS vistorias (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  imovel_id INT UNSIGNED NOT NULL,
  tipo ENUM('entrada','saida') NOT NULL,
  status ENUM('em_andamento','concluida') NOT NULL DEFAULT 'em_andamento',
  origem_id INT UNSIGNED NULL,
  data_vistoria DATE NOT NULL,
  observacoes TEXT NULL,
  assinatura MEDIUMTEXT NULL,
  concluida_em DATETIME NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vistorias_imovel (imovel_id),
  CONSTRAINT fk_vistorias_imovel FOREIGN KEY (imovel_id) REFERENCES imoveis(id) ON DELETE CASCADE,
  CONSTRAINT fk_vistorias_origem FOREIGN KEY (origem_id) REFERENCES vistorias(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS comodos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vistoria_id INT UNSIGNED NOT NULL,
  nome VARCHAR(100) NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  INDEX idx_comodos_vistoria (vistoria_id),
  CONSTRAINT fk_comodos_vistoria FOREIGN KEY (vistoria_id) REFERENCES vistorias(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS itens_vistoria (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  comodo_id INT UNSIGNED NOT NULL,
  nome VARCHAR(100) NOT NULL,
  tipo_opcao ENUM('estado','funcionamento') NOT NULL DEFAULT 'estado',
  condicao VARCHAR(20) NULL,
  comentario TEXT NULL,
  ordem INT NOT NULL DEFAULT 0,
  INDEX idx_itens_comodo (comodo_id),
  CONSTRAINT fk_itens_comodo FOREIGN KEY (comodo_id) REFERENCES comodos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fotos_item (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id INT UNSIGNED NOT NULL,
  caminho VARCHAR(255) NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fotos_item (item_id),
  CONSTRAINT fk_fotos_item FOREIGN KEY (item_id) REFERENCES itens_vistoria(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- IMPORTANTE: este script cria a estrutura nova. Faça backup do banco antigo antes de importar.
-- Para preservar registros antigos de imóveis, veja MIGRACAO_BANCO.sql.
