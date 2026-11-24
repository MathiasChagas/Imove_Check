<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';

$user   = require_user($pdo);
$uid    = (int)$user['id'];
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

const OPCOES_VALIDAS = [
    'estado'        => ['excelente', 'bom', 'regular', 'ruim'],
    'funcionamento' => ['funcionando', 'nao_funcionando', 'na'],
];

// [nome do item, tipo de avaliação] — ajuste à vontade
const COMODOS_PADRAO = [
    'Sala' => [['Paredes','estado'],['Piso','estado'],['Teto','estado'],['Janelas','estado'],['Tomadas','funcionamento'],['Iluminação','funcionamento']],
    'Cozinha' => [['Paredes','estado'],['Piso','estado'],['Teto','estado'],['Pia','estado'],['Armários','estado'],['Torneira','funcionamento'],['Tomadas','funcionamento']],
    'Banheiro' => [['Paredes','estado'],['Piso','estado'],['Teto','estado'],['Pia','estado'],['Box','estado'],['Vaso sanitário','funcionamento'],['Chuveiro','funcionamento'],['Iluminação','funcionamento']],
    'Quarto Principal' => [['Paredes','estado'],['Piso','estado'],['Teto','estado'],['Janelas','estado'],['Porta','estado'],['Tomadas','funcionamento']],
    'Área de Serviço' => [['Paredes','estado'],['Piso','estado'],['Tanque','estado'],['Torneira','funcionamento'],['Tomadas','funcionamento']],
];

/* ---------- funções auxiliares ---------- */
function erro(int $status, string $msg): never { json_response($status, ['success' => false, 'message' => $msg]); }
function ler_json(): array { return json_decode(file_get_contents('php://input'), true) ?: []; }

function buscar_um(PDO $pdo, string $sql, array $params, string $naoEncontrado): array {
    $s = $pdo->prepare($sql); $s->execute($params); $r = $s->fetch();
    if (!$r) erro(404, $naoEncontrado);
    return $r;
}
function vistoria_do_usuario(PDO $pdo, int $id, int $uid): array {
    return buscar_um($pdo, 'SELECT v.*, i.endereco, i.proprietario, i.inquilino FROM vistorias v JOIN imoveis i ON i.id=v.imovel_id WHERE v.id=? AND i.usuario_id=?', [$id, $uid], 'Vistoria não encontrada.');
}
function comodo_do_usuario(PDO $pdo, int $id, int $uid): array {
    return buscar_um($pdo, 'SELECT c.* FROM comodos c JOIN vistorias v ON v.id=c.vistoria_id JOIN imoveis i ON i.id=v.imovel_id WHERE c.id=? AND i.usuario_id=?', [$id, $uid], 'Cômodo não encontrado.');
}
function item_do_usuario(PDO $pdo, int $id, int $uid): array {
    return buscar_um($pdo, 'SELECT it.* FROM itens_vistoria it JOIN comodos c ON c.id=it.comodo_id JOIN vistorias v ON v.id=c.vistoria_id JOIN imoveis i ON i.id=v.imovel_id WHERE it.id=? AND i.usuario_id=?', [$id, $uid], 'Item não encontrado.');
}
function foto_do_usuario(PDO $pdo, int $id, int $uid): array {
    return buscar_um($pdo, 'SELECT f.* FROM fotos_item f JOIN itens_vistoria it ON it.id=f.item_id JOIN comodos c ON c.id=it.comodo_id JOIN vistorias v ON v.id=c.vistoria_id JOIN imoveis i ON i.id=v.imovel_id WHERE f.id=? AND i.usuario_id=?', [$id, $uid], 'Foto não encontrada.');
}
function apagar_arquivos(array $caminhos): void {
    foreach ($caminhos as $c) { $p = dirname(__DIR__) . '/' . $c; if (is_file($p)) unlink($p); }
}
function nome_valido(array $b, string $campo = 'nome'): string {
    $n = trim((string)($b[$campo] ?? ''));
    if ($n === '' || mb_strlen($n) > 100) erro(422, 'Informe um nome de até 100 caracteres.');
    return $n;
}

function montar_comodos(PDO $pdo, int $vid): array {
    $s = $pdo->prepare('SELECT id,nome FROM comodos WHERE vistoria_id=? ORDER BY ordem,id');
    $s->execute([$vid]); $comodos = $s->fetchAll();

    $s = $pdo->prepare('SELECT it.id,it.comodo_id,it.nome,it.tipo_opcao,it.condicao,it.comentario FROM itens_vistoria it JOIN comodos c ON c.id=it.comodo_id WHERE c.vistoria_id=? ORDER BY it.ordem,it.id');
    $s->execute([$vid]); $itens = $s->fetchAll();

    $s = $pdo->prepare('SELECT f.id,f.item_id,f.caminho FROM fotos_item f JOIN itens_vistoria it ON it.id=f.item_id JOIN comodos c ON c.id=it.comodo_id WHERE c.vistoria_id=? ORDER BY f.id');
    $s->execute([$vid]); $fotos = $s->fetchAll();

    $fotosPorItem = [];
    foreach ($fotos as $f) $fotosPorItem[(int)$f['item_id']][] = ['id' => (int)$f['id'], 'caminho' => $f['caminho']];

    $itensPorComodo = [];
    foreach ($itens as $it) {
        $it['id'] = (int)$it['id']; $it['comodo_id'] = (int)$it['comodo_id'];
        $it['fotos'] = $fotosPorItem[$it['id']] ?? [];
        $itensPorComodo[$it['comodo_id']][] = $it;
    }
    foreach ($comodos as &$c) { $c['id'] = (int)$c['id']; $c['itens'] = $itensPorComodo[$c['id']] ?? []; }
    unset($c);
    return $comodos;
}

function inserir_comodo(PDO $pdo, int $vid, string $nome, int $ordem, array $itens): int {
    $pdo->prepare('INSERT INTO comodos (vistoria_id,nome,ordem) VALUES (?,?,?)')->execute([$vid, $nome, $ordem]);
    $cid = (int)$pdo->lastInsertId();
    $ins = $pdo->prepare('INSERT INTO itens_vistoria (comodo_id,nome,tipo_opcao,ordem) VALUES (?,?,?,?)');
    foreach ($itens as $n => $it) $ins->execute([$cid, $it[0], $it[1], $n + 1]);
    return $cid;
}

/* ---------- criar vistoria ---------- */
if ($action === 'create' && $method === 'POST') {
    require_csrf(); $b = ler_json();
    $imovelId = (int)($b['imovel_id'] ?? 0); $tipo = (string)($b['tipo'] ?? '');
    if (!in_array($tipo, ['entrada', 'saida'], true)) erro(422, 'Tipo de vistoria inválido.');
    $s = $pdo->prepare('SELECT id FROM imoveis WHERE id=? AND usuario_id=?'); $s->execute([$imovelId, $uid]);
    if (!$s->fetch()) erro(404, 'Imóvel não encontrado.');

    $origemId = null;
    if ($tipo === 'saida') {
        $s = $pdo->prepare("SELECT id FROM vistorias WHERE imovel_id=? AND tipo='entrada' ORDER BY (status='concluida') DESC, id DESC LIMIT 1");
        $s->execute([$imovelId]); $origemId = $s->fetchColumn() ?: null;
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('INSERT INTO vistorias (imovel_id,tipo,origem_id,data_vistoria) VALUES (?,?,?,CURDATE())')->execute([$imovelId, $tipo, $origemId]);
        $vid = (int)$pdo->lastInsertId();
        if ($origemId) {
            foreach (montar_comodos($pdo, (int)$origemId) as $n => $c) {
                inserir_comodo($pdo, $vid, $c['nome'], $n + 1, array_map(fn($i) => [$i['nome'], $i['tipo_opcao']], $c['itens']));
            }
        } else {
            $n = 0;
            foreach (COMODOS_PADRAO as $nome => $itens) inserir_comodo($pdo, $vid, $nome, ++$n, $itens);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        erro(500, 'Não foi possível criar a vistoria.');
    }
    json_response(201, ['success' => true, 'id' => $vid, 'copiada' => (bool)$origemId]);
}

/* ---------- carregar vistoria (e entrada, para o laudo de saída) ---------- */
if ($action === 'get' && $method === 'GET') {
    $v = vistoria_do_usuario($pdo, (int)($_GET['id'] ?? 0), $uid);
    $out = [
        'success' => true,
        'vistoria' => [
            'id' => (int)$v['id'], 'imovel_id' => (int)$v['imovel_id'], 'tipo' => $v['tipo'], 'status' => $v['status'],
            'data_vistoria' => $v['data_vistoria'], 'observacoes' => $v['observacoes'], 'assinatura' => $v['assinatura'],
            'endereco' => $v['endereco'], 'proprietario' => $v['proprietario'], 'inquilino' => $v['inquilino'],
        ],
        'comodos' => montar_comodos($pdo, (int)$v['id']),
    ];
    if (isset($_GET['laudo']) && $v['tipo'] === 'saida' && $v['origem_id']) {
        $out['entrada'] = montar_comodos($pdo, (int)$v['origem_id']);
    }
    json_response(200, $out);
}

if ($method !== 'POST') erro(405, 'Operação não permitida.');
require_csrf();

/* ---------- condição do item ---------- */
if ($action === 'set_condicao') {
    $b = ler_json(); $item = item_do_usuario($pdo, (int)($b['item_id'] ?? 0), $uid);
    $cond = $b['condicao'] ?? null;
    if ($cond !== null && !in_array($cond, OPCOES_VALIDAS[$item['tipo_opcao']], true)) erro(422, 'Condição inválida.');
    $pdo->prepare('UPDATE itens_vistoria SET condicao=? WHERE id=?')->execute([$cond, $item['id']]);
    json_response(200, ['success' => true]);
}

/* ---------- comentário do item ---------- */
if ($action === 'set_comentario') {
    $b = ler_json(); $item = item_do_usuario($pdo, (int)($b['item_id'] ?? 0), $uid);
    $txt = trim((string)($b['comentario'] ?? ''));
    if (mb_strlen($txt) > 1000) erro(422, 'O comentário pode ter no máximo 1000 caracteres.');
    $pdo->prepare('UPDATE itens_vistoria SET comentario=? WHERE id=?')->execute([$txt ?: null, $item['id']]);
    json_response(200, ['success' => true]);
}

/* ---------- adicionar / remover item ---------- */
if ($action === 'add_item') {
    $b = ler_json(); $c = comodo_do_usuario($pdo, (int)($b['comodo_id'] ?? 0), $uid);
    $nome = nome_valido($b); $tipo = (string)($b['tipo_opcao'] ?? 'estado');
    if (!isset(OPCOES_VALIDAS[$tipo])) erro(422, 'Tipo de avaliação inválido.');
    $s = $pdo->prepare('SELECT COALESCE(MAX(ordem),0)+1 FROM itens_vistoria WHERE comodo_id=?'); $s->execute([$c['id']]);
    $ordem = (int)$s->fetchColumn();
    $pdo->prepare('INSERT INTO itens_vistoria (comodo_id,nome,tipo_opcao,ordem) VALUES (?,?,?,?)')->execute([$c['id'], $nome, $tipo, $ordem]);
    json_response(201, ['success' => true, 'item' => ['id' => (int)$pdo->lastInsertId(), 'comodo_id' => (int)$c['id'], 'nome' => $nome, 'tipo_opcao' => $tipo, 'condicao' => null, 'comentario' => null, 'fotos' => []]]);
}
if ($action === 'del_item') {
    $b = ler_json(); $item = item_do_usuario($pdo, (int)($b['item_id'] ?? 0), $uid);
    $s = $pdo->prepare('SELECT caminho FROM fotos_item WHERE item_id=?'); $s->execute([$item['id']]);
    $caminhos = $s->fetchAll(PDO::FETCH_COLUMN);
    $pdo->prepare('DELETE FROM itens_vistoria WHERE id=?')->execute([$item['id']]);
    apagar_arquivos($caminhos);
    json_response(200, ['success' => true]);
}

/* ---------- adicionar / remover cômodo ---------- */
if ($action === 'add_comodo') {
    $b = ler_json(); $v = vistoria_do_usuario($pdo, (int)($b['vistoria_id'] ?? 0), $uid);
    $nome = nome_valido($b);
    $s = $pdo->prepare('SELECT COALESCE(MAX(ordem),0)+1 FROM comodos WHERE vistoria_id=?'); $s->execute([$v['id']]);
    $cid = inserir_comodo($pdo, (int)$v['id'], $nome, (int)$s->fetchColumn(), []);
    json_response(201, ['success' => true, 'comodo' => ['id' => $cid, 'nome' => $nome, 'itens' => []]]);
}
if ($action === 'del_comodo') {
    $b = ler_json(); $c = comodo_do_usuario($pdo, (int)($b['comodo_id'] ?? 0), $uid);
    $s = $pdo->prepare('SELECT f.caminho FROM fotos_item f JOIN itens_vistoria it ON it.id=f.item_id WHERE it.comodo_id=?'); $s->execute([$c['id']]);
    $caminhos = $s->fetchAll(PDO::FETCH_COLUMN);
    $pdo->prepare('DELETE FROM comodos WHERE id=?')->execute([$c['id']]);
    apagar_arquivos($caminhos);
    json_response(200, ['success' => true]);
}

/* ---------- fotos do item ---------- */
if ($action === 'upload_foto') {
    $item = item_do_usuario($pdo, (int)($_POST['item_id'] ?? 0), $uid);
    $f = $_FILES['foto'] ?? null;
    if (!$f || $f['error'] !== UPLOAD_ERR_OK) erro(422, 'Erro durante o envio da foto.');
    if ($f['size'] > 5 * 1024 * 1024) erro(422, 'Cada foto deve ter no máximo 5 MB.');
    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
    if (!isset($allowed[$mime]) || @getimagesize($f['tmp_name']) === false) erro(422, 'Formato inválido. Use JPG, PNG ou WEBP.');
    $s = $pdo->prepare('SELECT COUNT(*) FROM fotos_item WHERE item_id=?'); $s->execute([$item['id']]);
    if ((int)$s->fetchColumn() >= 10) erro(422, 'Máximo de 10 fotos por item.');
    $dir = dirname(__DIR__) . '/uploads';
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) erro(500, 'Não foi possível criar a pasta uploads.');
    $nome = bin2hex(random_bytes(16)) . '.' . $allowed[$mime];
    if (!move_uploaded_file($f['tmp_name'], $dir . '/' . $nome)) erro(500, 'Não foi possível salvar a foto.');
    $pdo->prepare('INSERT INTO fotos_item (item_id,caminho) VALUES (?,?)')->execute([$item['id'], 'uploads/' . $nome]);
    json_response(201, ['success' => true, 'foto' => ['id' => (int)$pdo->lastInsertId(), 'caminho' => 'uploads/' . $nome]]);
}
if ($action === 'del_foto') {
    $b = ler_json(); $f = foto_do_usuario($pdo, (int)($b['foto_id'] ?? 0), $uid);
    $pdo->prepare('DELETE FROM fotos_item WHERE id=?')->execute([$f['id']]);
    apagar_arquivos([$f['caminho']]);
    json_response(200, ['success' => true]);
}

/* ---------- observações, assinatura e conclusão ---------- */
if ($action === 'set_obs') {
    $b = ler_json(); $v = vistoria_do_usuario($pdo, (int)($b['vistoria_id'] ?? 0), $uid);
    $txt = trim((string)($b['observacoes'] ?? ''));
    if (mb_strlen($txt) > 5000) erro(422, 'As observações podem ter no máximo 5000 caracteres.');
    $pdo->prepare('UPDATE vistorias SET observacoes=? WHERE id=?')->execute([$txt ?: null, $v['id']]);
    json_response(200, ['success' => true]);
}
if ($action === 'set_assinatura') {
    $b = ler_json(); $v = vistoria_do_usuario($pdo, (int)($b['vistoria_id'] ?? 0), $uid);
    $a = (string)($b['assinatura'] ?? '');
    if ($a !== '' && (strlen($a) > 400000 || !preg_match('#^data:image/png;base64,[A-Za-z0-9+/=]+$#', $a))) erro(422, 'Assinatura inválida.');
    $pdo->prepare('UPDATE vistorias SET assinatura=? WHERE id=?')->execute([$a ?: null, $v['id']]);
    json_response(200, ['success' => true]);
}
if ($action === 'concluir') {
    $b = ler_json(); $v = vistoria_do_usuario($pdo, (int)($b['vistoria_id'] ?? 0), $uid);
    $pdo->prepare("UPDATE vistorias SET status='concluida', concluida_em=NOW() WHERE id=?")->execute([$v['id']]);
    json_response(200, ['success' => true, 'message' => 'Vistoria concluída.']);
}

erro(405, 'Operação não permitida.');