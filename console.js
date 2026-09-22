(async () => {
    const BASE = location.origin;

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    const clean = text =>
        (text || "")
            .replace(/\u00a0/g, " ")
            .replace(/\s+/g, " ")
            .trim();

    // Busca a página inicial
    const homeHTML = await fetch(BASE + "/").then(r => r.text());
    const homeDoc = new DOMParser().parseFromString(homeHTML, "text/html");

    // O site usa páginas numéricas como /20/, /123/ etc.
    const links = [...homeDoc.querySelectorAll("a[href]")]
        .map(a => ({
            nome: clean(a.textContent),
            url: new URL(a.getAttribute("href"), BASE).href
        }))
        .filter(x => /^\/\d+\/?$/.test(new URL(x.url).pathname));

    // Remove duplicados
    const unicos = [
        ...new Map(links.map(x => [x.url, x])).values()
    ];

    console.log(`Encontradas ${unicos.length} magias.`);

    const magias = [];

    for (let i = 0; i < unicos.length; i++) {
        const item = unicos[i];

        console.log(
            `[${i + 1}/${unicos.length}] ${item.nome}`
        );

        try {
            const html = await fetch(item.url).then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.text();
            });

            const doc = new DOMParser().parseFromString(html, "text/html");

            const bodyText = clean(doc.body.innerText);

            // Título
            const h1 = doc.querySelector("h1");
            const nome = clean(h1?.textContent) || item.nome;

            // Procura o título da magia dentro da página
            const tituloMagia = [...doc.querySelectorAll("h1")]
                .find(el => clean(el.textContent) === nome);

            const partesDescricao = [];

            let elemento = tituloMagia?.nextElementSibling;

            while (elemento) {
                const texto = clean(elemento.innerText);

                // Para ao chegar nos aprimoramentos
                if (/^\+\d+\s*PM\s*:/i.test(texto)) {
                    break;
                }

                if (texto) {
                    partesDescricao.push(texto);
                }

                elemento = elemento.nextElementSibling;
            }

            const descricao = partesDescricao.join("\n\n");

            const aprimoramentos = [];

            const elementos = [...doc.querySelectorAll("p, li")];

            for (const elemento of elementos) {
                const texto = clean(elemento.innerText);

                // Ajuste este padrão ao formato que a página usa
                // Exemplos: "+1 PM:", "+2 PM:", "+5 PM:"
                const match = texto.match(/^\+(\d+)\s*PM\s*:\s*(.+)$/i);

                if (match) {
                    aprimoramentos.push({
                        custo_pm: Number(match[1]),
                        texto: match[2].trim()
                    });
                }
            }

            // Escola normalmente aparece em H2
            const escola = clean(doc.querySelector("h2")?.textContent);

            // "Universal - 1º círculo"
            const subtitulo = clean(
                doc.querySelector("h5")?.textContent
            );

            let tipo = null;
            let circulo = null;

            const match = subtitulo.match(
                /(.+?)\s*-\s*(\d+)[º°]?\s*círculo/i
            );

            if (match) {
                tipo = clean(match[1]);
                circulo = Number(match[2]);
            }

            function pegarCampo(label, proximoLabel) {
                const inicio = bodyText.indexOf(label);

                if (inicio === -1) return null;

                const start = inicio + label.length;

                let end = bodyText.length;

                if (proximoLabel) {
                    const pos = bodyText.indexOf(proximoLabel, start);

                    if (pos !== -1)
                        end = pos;
                }

                return clean(bodyText.slice(start, end));
            }

            const execucao = pegarCampo(
                "Execução:",
                "Alcance:"
            );

            const alcance = pegarCampo(
                "Alcance:",
                "Duração:"
            );

            const duracao = pegarCampo(
                "Duração:",
                "Alvo/Área/Efeito:"
            );

            const alvo = pegarCampo(
                "Alvo/Área/Efeito:",
                "Resistência:"
            );

            const resistencia = pegarCampo(
                "Resistência:",
                "Publicação:"
            );

            let publicacao = pegarCampo(
                "Publicação:",
                nome
            );

            magias.push({
            id: Number(
                new URL(item.url).pathname.match(/\d+/)?.[0]
            ),
            nome,
            escola,
            tipo,
            circulo,
            execucao,
            alcance,
            duracao,
            alvo_area_efeito: alvo,
            resistencia,
            publicacao,
            descricao,
            aprimoramentos
        });

        } catch (erro) {
            console.error(
                `Erro em ${item.nome}:`,
                erro
            );

            magias.push({
                nome: item.nome,
                url: item.url,
                erro: String(erro)
            });
        }

        // Evita disparar centenas de requisições simultâneas
        await sleep(80);
    }

    // Ordena pelo ID
    magias.sort((a, b) => (a.id ?? 999999) - (b.id ?? 999999));

    const json = JSON.stringify(magias, null, 2);

    // Deixa disponível no console
    window.magiasT20 = magias;

    // Cria arquivo
    const blob = new Blob(
        [json],
        { type: "application/json;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "magias_t20.json";

    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    console.log("================================");
    console.log("FINALIZADO");
    console.log(`Magias exportadas: ${magias.length}`);
    console.log("Arquivo: magias_t20.json");
    console.log("Variável disponível: window.magiasT20");
    console.log("================================");
})();