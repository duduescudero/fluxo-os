param([switch]$ReadOnly)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $root
$dockerCommand=Get-Command docker -ErrorAction SilentlyContinue
$docker=if($dockerCommand){$dockerCommand.Source}else{$null}
if(-not $docker){foreach($candidate in @("$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin\docker.exe",'C:\Program Files\Docker\Docker\resources\bin\docker.exe')){if(Test-Path -LiteralPath $candidate){$docker=$candidate;break}}}
if(-not $docker){throw 'Instale e abra o Docker Desktop antes de iniciar.'}
$env:PATH=(Split-Path -Parent $docker)+';'+$env:PATH
& $docker info --format '{{.ServerVersion}}' | Out-Null
if($LASTEXITCODE -ne 0){throw 'Abra o Docker Desktop e aguarde o mecanismo iniciar.'}
$environment=Join-Path $root '.env'
if(-not(Test-Path -LiteralPath $environment)){
  $rng=[Security.Cryptography.RandomNumberGenerator]::Create()
  function New-LocalPassword { $bytes=New-Object byte[] 24;$rng.GetBytes($bytes);return 'Local!7'+([BitConverter]::ToString($bytes).Replace('-','')) }
  $pg=New-LocalPassword;$bootstrap=New-LocalPassword
  $lines=@("POSTGRES_PASSWORD=$pg","BOOTSTRAP_PASSWORD=$bootstrap",'DEMO_ENABLED=false','APP_PORT=8080')
  [IO.File]::WriteAllLines($environment,$lines,[Text.UTF8Encoding]::new($false));$rng.Dispose()
}
$env:DEMO_ENABLED=if($ReadOnly){'true'}else{'false'}
& $docker compose up --build --detach --wait
if($LASTEXITCODE -ne 0){throw 'Falha ao iniciar. Consulte docker compose logs; os volumes foram preservados.'}
Write-Host 'Fluxo OS disponivel em http://localhost:8080'
if($ReadOnly){Write-Host 'Use os botoes de demonstracao. Alteracoes estao bloqueadas.'}
else{
  $password=Get-Content -LiteralPath $environment | Where-Object {$_ -like 'BOOTSTRAP_PASSWORD=*'} | ForEach-Object {$_.Substring('BOOTSTRAP_PASSWORD='.Length)}
  Write-Host 'Administrador: admin@fluxo.example'
  Write-Host 'Tecnico: tecnico@fluxo.example'
  Write-Host "Senha local inicial: $password"
  Write-Host 'A senha e gerada neste computador e fica apenas em .env. Nao publique esse arquivo.'
}
