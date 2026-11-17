#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::process::Command;

fn abrir_com_o_sistema(alvo: &str) -> Result<(), String> {
    let mut c = if cfg!(windows) { Command::new("explorer") } else if cfg!(target_os = "macos") { Command::new("open") } else { Command::new("xdg-open") };
    c.arg(alvo).spawn().map(|_| ()).map_err(|e| e.to_string())
}

/// Atualização do próprio Vyntem no Windows: baixa o instalador (só do GitHub), confere o SHA-256, instala em silêncio e reabre.
#[tauri::command]
fn instalar_atualizacao(url: String, sha256: String) -> Result<(), String> {
    if !cfg!(windows) {
        return Err("A atualização automática é só para Windows.".into());
    }
    let host_ok = url.strip_prefix("https://").and_then(|r| r.split('/').next()).map(|h| h == "github.com" || h.ends_with(".github.com") || h.ends_with(".githubusercontent.com")).unwrap_or(false);
    if !host_ok || url.chars().any(|c| c.is_whitespace() || c == '"' || c == '\'' || c == '`' || c == '$') {
        return Err("Endereço de atualização não permitido.".into());
    }
    if !sha256.is_empty() && !(sha256.len() == 64 && sha256.chars().all(|c| c.is_ascii_hexdigit())) {
        return Err("Assinatura da atualização inválida.".into());
    }
    let destino = std::env::temp_dir().join("VyntemSetup-atualizacao.exe");
    let atual = std::env::current_exe().map_err(|e| e.to_string())?;
    // Tudo roda num PowerShell separado, para continuar depois que este app fechar. Os valores vão por variáveis de ambiente (sem montar texto de comando com eles).
    let roteiro = "$ErrorActionPreference='Stop'; \
        [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; \
        Invoke-WebRequest -Uri $env:V_URL -OutFile $env:V_SAIDA -UseBasicParsing; \
        if ($env:V_SHA -ne '' -and (Get-FileHash -Algorithm SHA256 $env:V_SAIDA).Hash -ne $env:V_SHA) { Remove-Item $env:V_SAIDA -Force; exit 3 }; \
        Start-Process -FilePath $env:V_SAIDA -ArgumentList '/S' -Wait; \
        Remove-Item $env:V_SAIDA -Force -ErrorAction SilentlyContinue; \
        Start-Process -FilePath $env:V_APP";
    Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass", "-Command", roteiro])
        .env("V_URL", &url)
        .env("V_SAIDA", &destino)
        .env("V_SHA", sha256.to_uppercase())
        .env("V_APP", &atual)
        .spawn()
        .map_err(|e| format!("Não consegui iniciar a atualização: {e}"))?;
    // dá um respiro para o PowerShell começar e fecha o Vyntem (o instalador também fecharia, mas assim não trava)
    std::thread::spawn(|| {
        std::thread::sleep(std::time::Duration::from_secs(20));
        std::process::exit(0);
    });
    Ok(())
}

// ---- Atualização em duas etapas (igual à Vênus): baixar com barra de andamento e, depois, instalar quando a pessoa escolher.
struct Baixando {
    filho: std::process::Child,
    saida: std::path::PathBuf,
    total: u64,
}
static BAIXANDO: std::sync::Mutex<Option<Baixando>> = std::sync::Mutex::new(None);
static BAIXADA: std::sync::Mutex<Option<std::path::PathBuf>> = std::sync::Mutex::new(None);

#[derive(Serialize)]
struct ProgressoAtualizacao {
    /// "parada", "baixando", "pronta" ou "erro"
    estado: String,
    feitos: u64,
    total: u64,
    erro: String,
}

fn url_de_atualizacao_permitida(url: &str) -> bool {
    let host_ok = url.strip_prefix("https://").and_then(|r| r.split('/').next()).map(|h| h == "github.com" || h.ends_with(".github.com") || h.ends_with(".githubusercontent.com")).unwrap_or(false);
    host_ok && !url.chars().any(|c| c.is_whitespace() || c == '"' || c == '\'' || c == '`' || c == '$')
}

/// Começa a baixar o instalador (só do GitHub) numa tarefa separada. O andamento sai de `progresso_atualizacao`.
#[tauri::command]
fn baixar_atualizacao(url: String, sha256: String, tamanho: u64) -> Result<(), String> {
    if !cfg!(windows) {
        return Err("A atualização automática é só para Windows.".into());
    }
    if !url_de_atualizacao_permitida(&url) {
        return Err("Endereço de atualização não permitido.".into());
    }
    if !sha256.is_empty() && !(sha256.len() == 64 && sha256.chars().all(|c| c.is_ascii_hexdigit())) {
        return Err("Assinatura da atualização inválida.".into());
    }
    let mut g = BAIXANDO.lock().map_err(|_| "Estado da atualização indisponível.".to_string())?;
    if g.is_some() {
        return Err("Já estou baixando a atualização.".into());
    }
    let saida = std::env::temp_dir().join("VyntemSetup-atualizacao.exe");
    let _ = std::fs::remove_file(&saida);
    let roteiro = "$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; \
        [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; \
        Invoke-WebRequest -Uri $env:V_URL -OutFile $env:V_SAIDA -UseBasicParsing; \
        if ($env:V_SHA -ne '' -and (Get-FileHash -Algorithm SHA256 $env:V_SAIDA).Hash -ne $env:V_SHA) { Remove-Item $env:V_SAIDA -Force; exit 3 }";
    let filho = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass", "-Command", roteiro])
        .env("V_URL", &url)
        .env("V_SAIDA", &saida)
        .env("V_SHA", sha256.to_uppercase())
        .spawn()
        .map_err(|e| format!("Não consegui começar o download: {e}"))?;
    *g = Some(Baixando { filho, saida, total: tamanho });
    if let Ok(mut b) = BAIXADA.lock() {
        *b = None;
    }
    Ok(())
}

#[tauri::command]
fn progresso_atualizacao() -> ProgressoAtualizacao {
    let parado = |estado: &str, erro: &str| ProgressoAtualizacao { estado: estado.into(), feitos: 0, total: 0, erro: erro.into() };
    let Ok(mut g) = BAIXANDO.lock() else { return parado("erro", "Estado da atualização indisponível.") };
    let Some(b) = g.as_mut() else {
        return if BAIXADA.lock().map(|x| x.is_some()).unwrap_or(false) { parado("pronta", "") } else { parado("parada", "") };
    };
    let feitos = std::fs::metadata(&b.saida).map(|m| m.len()).unwrap_or(0);
    match b.filho.try_wait() {
        Ok(None) => ProgressoAtualizacao { estado: "baixando".into(), feitos, total: b.total, erro: String::new() },
        Ok(Some(st)) if st.success() && b.saida.is_file() => {
            let total = feitos;
            if let Ok(mut baixada) = BAIXADA.lock() {
                *baixada = Some(b.saida.clone());
            }
            *g = None;
            ProgressoAtualizacao { estado: "pronta".into(), feitos: total, total, erro: String::new() }
        }
        Ok(Some(st)) => {
            let erro = if st.code() == Some(3) { "O arquivo baixado não confere com o publicado. Nada foi instalado." } else { "Não consegui baixar a atualização. Confira a internet e tente de novo." };
            *g = None;
            parado("erro", erro)
        }
        Err(_) => {
            *g = None;
            parado("erro", "Não consegui acompanhar o download.")
        }
    }
}

/// Instala o que já foi baixado: instalador em silêncio e o Vyntem abre de novo sozinho.
#[tauri::command]
fn instalar_atualizacao_baixada() -> Result<(), String> {
    let arquivo = BAIXADA.lock().map_err(|_| "Estado da atualização indisponível.".to_string())?.clone().ok_or("Ainda não há atualização baixada.")?;
    if !arquivo.is_file() {
        return Err("O arquivo baixado sumiu. Baixe de novo.".into());
    }
    let atual = std::env::current_exe().map_err(|e| e.to_string())?;
    let roteiro = "$ErrorActionPreference='Stop'; \
        Start-Process -FilePath $env:V_SAIDA -ArgumentList '/S' -Wait; \
        Remove-Item $env:V_SAIDA -Force -ErrorAction SilentlyContinue; \
        Start-Process -FilePath $env:V_APP";
    Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass", "-Command", roteiro])
        .env("V_SAIDA", &arquivo)
        .env("V_APP", &atual)
        .spawn()
        .map_err(|e| format!("Não consegui iniciar a atualização: {e}"))?;
    std::thread::spawn(|| {
        std::thread::sleep(std::time::Duration::from_secs(20));
        std::process::exit(0);
    });
    Ok(())
}

/// Abre um endereço https no navegador padrão (só https, sem espaços nem aspas).
#[tauri::command]
fn abrir_link(url: String) -> Result<(), String> {
    if !url.starts_with("https://") || url.chars().any(|c| c.is_whitespace() || c == '"' || c == '\'' || c == '<' || c == '>' || c == '^' || c == '&' || c == '|') {
        return Err("Endereço não permitido.".into());
    }
    abrir_com_o_sistema(&url)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![abrir_link, instalar_atualizacao, baixar_atualizacao, progresso_atualizacao, instalar_atualizacao_baixada])
        .run(tauri::generate_context!())
        .expect("não foi possível iniciar o Vyntem");
}
