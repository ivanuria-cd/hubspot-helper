# MCP bezero bat (Claude Desktop) aplikaziora konektatu

**Aurrebaldintzak:** aplikazioan proiektu bat sortuta eta irekita izatea.
**Estimatutako denbora:** 3 minutu.

## Urratsak

1. Ireki zure proiektua aplikazioan.
2. Alboko menuan, sakatu **Konfigurazioa**.
3. Konektoreen atalean, sakatu **API / MCP**.
4. Aktibatu **MCP zerbitzaria** etengailua. Egoera **MCP zerbitzaria aktibo** bihurtuko da eta **Ataka** erakutsiko da (lehenetsia, 3741).
5. Sakatu **Kopiatu konfigurazioa** zure MCP bezerorako prest dagoen snippet-a kopiatzeko.
6. Itsatsi snippet-a zure bezeroaren konfigurazio-fitxategian (adibidez, Claude Desktop-en `claude_desktop_config.json`) eta berrabiarazi ezazu.

> **Zergatik `mcp-remote`:** Claude Desktop-ek **stdio** zerbitzariak soilik onartzen ditu bere konfigurazio-fitxategian (ez du `url`/`headers` onartzen). Snippet-ak `npx mcp-remote` erabiltzen du tokiko zubi gisa aplikazioaren SSE zerbitzarirantz, tokena `env`-en duela. **Node.js/npx** instalatuta izatea eskatzen du. Fitxategirik gabeko alternatiba: gehitu urruneko zerbitzaria Claude Desktop-en **Settings > Connectors** atalean `http://127.0.0.1:3741/sse` URLarekin eta `x-api-key` goiburuarekin.

## Espero den emaitza

- MCP bezeroa tokiko zerbitzarira konektatzen da eta **tool erabilgarriak** zerrendatzen ditu.
- **API / MCP** pantailan bezeroak erabil ditzakeen tool-en zerrenda ikusiko duzu (hasieran, gutxienez `mcp_health`, konexioa eta proiektu aktiboa baieztatzen dituena).

## Sarbide-tokena

Zerbitzariak `x-api-key` goiburuan bidaltzen den **sarbide-token** bat eskatzen du. Snippet-ak jada barneratzen du. Begi-ikonoarekin erakutsi edo ezkutatu dezakezu, kopiatu, edo sakatu **Birsortu** berri bat sortzeko.

> Tokena birsortzean, aurrekoak berehala funtzionatzeari uzten dio. Konfigurazioa berriz kopiatu beharko duzu zure bezeroan.

## Ohiko galderak

**Zerbitzaria nire sarean agerian al dago?** Ez. `127.0.0.1`-en soilik entzuten du (zure ekipoan); ez da beste gailuetatik atzigarria.

**Zer proiektu ikusten dute tool-ek?** Aplikazioan aktibo dagoen proiektua. Tool-ek ez dute beste proiektuetara atzitzen.

**Aplikazioa irekita utzi behar al dut?** Bai. MCP zerbitzaria aplikazioaren barruan exekutatzen da; ixten baduzu, bezeroak konexioa galduko du. Zerbitzaria aktibatuta uzten baduzu, aplikazioa irekitzen duzun hurrengoan automatikoki berrabiarazten da.

**Nola itzaltzen dut?** Desaktibatu **MCP zerbitzaria** etengailua pantaila berean.
