<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';

$user = require_user($pdo);
$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$id || $id < 1) json_response(400, ['success' => false, 'message' => 'Identificador inválido.']);

$s = $pdo->prepare('SELECT id,endereco,proprietario,inquilino FROM imoveis WHERE id=? AND usuario_id=?');
$s->execute([$id, $user['id']]);
$imovel = $s->fetch();
if (!$imovel) json_response(404, ['success' => false, 'message' => 'Imóvel não encontrado.']);

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $s = $pdo->prepare('SELECT id,caminho FROM fotos WHERE imovel_id=? ORDER BY id');
    $s->execute([$id]);
    $fotos = $s->fetchAll();

    $s = $pdo->prepare('SELECT v.id,v.tipo,v.status,v.data_vistoria,
        (SELECT COUNT(*) FROM comodos c WHERE c.vistoria_id=v.id) AS total_comodos
        FROM vistorias v WHERE v.imovel_id=? ORDER BY v.id DESC');
    $s->execute([$id]);

    json_response(200, ['success' => true, 'imovel' => $imovel, 'fotos' => $fotos, 'vistorias' => $s->fetchAll()]);
}

if ($method === 'POST') {
    require_csrf();
    $b = json_decode(file_get_contents('php://input'), true) ?: [];
    $endereco = trim((string)($b['endereco'] ?? ''));
    $prop = trim((string)($b['proprietario'] ?? ''));
    $inq = trim((string)($b['inquilino'] ?? ''));
    if ($endereco === '') json_response(422, ['success' => false, 'message' => 'Informe o endereço do imóvel.']);
    if (mb_strlen($endereco) > 255 || mb_strlen($prop) > 150 || mb_strlen($inq) > 150)
        json_response(422, ['success' => false, 'message' => 'Um ou mais campos ultrapassaram o limite permitido.']);
    $pdo->prepare('UPDATE imoveis SET endereco=?, proprietario=?, inquilino=? WHERE id=? AND usuario_id=?')
        ->execute([$endereco, $prop ?: null, $inq ?: null, $id, $user['id']]);
    json_response(200, ['success' => true, 'message' => 'Imóvel atualizado com sucesso.']);
}

json_response(405, ['success' => false, 'message' => 'Método não permitido.']);