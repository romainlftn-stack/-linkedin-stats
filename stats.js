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

    if (!data.results) {
      return res.status(500).json({ error: "Réponse Notion invalide", detail: data });
    }

    const stats = data.results.map((page) => {
      const props = page.properties;
      return {
        semaine: props["Semaine"]?.title?.[0]?.plain_text ?? "?",
        impressions: props["Impressions"]?.number ?? 0,
        reactions: props["Réactions"]?.number ?? 0,
        commentaires: props["Commentaires"]?.number ?? 0,
        xImp: props["× Impressions vs S-1"]?.number ?? null,
        xReac: props["× Réactions vs S-1"]?.number ?? null,
        debut: props["Période"]?.date?.start ?? null,
      };
    });

    res.status(200).json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
