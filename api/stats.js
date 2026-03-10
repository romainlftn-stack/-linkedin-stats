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
      body: JSON.stringify({}), // Pas de tri côté Notion (accents = bug)
    });

    const data = await response.json();

    // Debug : /api/stats?debug=true pour voir la réponse brute
    if (req.query && req.query.debug === "true") {
      return res.status(200).json(data);
    }

    if (!data.results) {
      return res.status(500).json({ error: "Réponse Notion invalide", detail: data });
    }

    const stats = data.results.map((page) => {
      const props = page.properties;

      // Récupère n'importe quelle propriété par nom exact ou approximatif
      function get(name) {
        if (props[name]) return props[name];
        const n = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f×]/g, "");
        const key = Object.keys(props).find(k => n(k) === n(name));
        return key ? props[key] : undefined;
      }

      const dateStart = get("Période")?.date?.start ?? get("Periode")?.date?.start ?? null;

      return {
        semaine: get("Semaine")?.title?.[0]?.plain_text ?? "?",
        impressions: get("Impressions")?.number ?? 0,
        reactions: get("Réactions")?.number ?? get("Reactions")?.number ?? 0,
        commentaires: get("Commentaires")?.number ?? 0,
        xImp: get("× Impressions vs S-1")?.number ?? null,
        xReac: get("× Réactions vs S-1")?.number ?? null,
        debut: dateStart,
      };
    });

    // Tri chronologique côté JS (évite le problème d'accents dans l'API Notion)
    stats.sort((a, b) => {
      if (!a.debut) return 1;
      if (!b.debut) return -1;
      return a.debut.localeCompare(b.debut);
    });

    res.status(200).json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
