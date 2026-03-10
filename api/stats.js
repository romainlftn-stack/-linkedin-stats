export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const token = process.env.NOTION_TOKEN;
  const dbId = "12d8489af9a249ae9ad2b4c2f10f23ad";

  if (!token) {
    return res.status(500).json({ error: "NOTION_TOKEN manquant" });
  }

  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sorts: [{ property: "Période", direction: "ascending" }],
      }),
    });

    const data = await response.json();

    // Mode debug : ajoute ?debug=true dans l'URL pour voir la réponse brute Notion
    if (req.query && req.query.debug === "true") {
      return res.status(200).json(data);
    }

    if (!data.results) {
      return res.status(500).json({ error: "Réponse Notion invalide", detail: data });
    }

    // Trouve une propriété par nom, insensible aux accents et à la casse
    function getProp(props, name) {
      if (props[name] !== undefined) return props[name];
      const normalize = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f×]/g, "");
      const target = normalize(name);
      const key = Object.keys(props).find(k => normalize(k) === target);
      return key ? props[key] : undefined;
    }

    const stats = data.results.map((page) => {
      const props = page.properties;
      return {
        semaine: getProp(props, "Semaine")?.title?.[0]?.plain_text ?? "?",
        impressions: getProp(props, "Impressions")?.number ?? 0,
        reactions: getProp(props, "Réactions")?.number ?? 0,
        commentaires: getProp(props, "Commentaires")?.number ?? 0,
        xImp: getProp(props, "× Impressions vs S-1")?.number ?? null,
        xReac: getProp(props, "× Réactions vs S-1")?.number ?? null,
        debut: getProp(props, "Période")?.date?.start ?? null,
      };
    });

    res.status(200).json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
