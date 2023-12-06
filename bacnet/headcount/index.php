<?php
if (!function_exists('str_starts_with')) {
    function str_starts_with($haystack, $needle) {
        return (string)$needle !== '' && strncmp($haystack, $needle, strlen($needle)) === 0;
    }
}

$filename = "latest.json";
$request_method = filter_input( \INPUT_SERVER, 'REQUEST_METHOD', \FILTER_SANITIZE_SPECIAL_CHARS );
$request_uri = filter_input( \INPUT_SERVER, 'REQUEST_URI', \FILTER_SANITIZE_SPECIAL_CHARS );
$zone_id = str_starts_with($request_uri, "/bacnet/headcount/zoneid/") ? intval(substr($request_uri, strlen('/bacnet/headcount/zoneid/'))) : 0;

switch($request_method)
{
    case "GET":
        ob_clean();
        header_remove();
        header('Content-Type: application/json; charset=utf-8');
        $json_string = ReadJsonFile($filename);
        if ($zone_id > 0)
        {
            $json = json_decode($json_string, true);
            $headcount = array_column($json, null, 'zoneId')[$zone_id]["headcount"] ?? 0;
            echo $headcount;
        }
        else echo $json_string;
        break;
    case "POST":
        ob_clean();
        header_remove();
        $data = json_decode(file_get_contents("php://input"), true);
        $json = json_encode($data);
        if ($json === false) $json = "Error";
        file_put_contents($filename, $json);
        header('Content-Type: application/json; charset=utf-8');
        echo ReadJsonFile($filename);
        break;
}

function ReadJsonFile($filename): string
{
    $latest = json_decode(file_get_contents($filename));
    $json = json_encode($latest);
    if ($json === false) {
        if ($json = json_encode(["jsonError" => json_last_error_msg()]) === false) $json = '{"jsonError":"unknown"}';
        http_response_code(500);
    }
    return $json;
}