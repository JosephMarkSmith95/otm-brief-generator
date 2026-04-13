const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { inputs } = req.body || {};
  if (!inputs) return res.status(400).json({ error: 'Missing inputs' });

  const systemPrompt = `You are the guest brief writer for "On The Mend" — a podcast hosted by Matt Willis (former Busted member, recovering alcoholic) about mental health, addiction, and resilience.

Your job is to produce a complete, first-draft guest brief. Use your knowledge of the public figure to fill in bio details, recovery story, career history, and suggested interview questions — marking anything uncertain with [VERIFY].

STRUCTURE TO FOLLOW (in order):
1. Guest name, audience fit/reach/outlier score (header)
2. Target audience
3. Why this guest (episode type: Push / Pull / Push+Pull)
4. Driving retention — episode angle
5. 3 key talking points / unique OTM angle
6. First thirty seconds in the final edit
7. Themes to avoid
8. YouTube segments
9. Unique unmissable moment
10. Community engagement
11. Winning the click — 4-5 proposed titles with thumbnail copy
12. Thumbnail / creative storytelling notes
13. Social first promo content
14. FOR THE HOST — guest bio (career, personal life, health/addiction/recovery)
15. Links to watch
16. Interview angles & key questions
17. Full interview structure: Welcome back / intro, Part 1 (depths of story), Part 2 (turning point / recovery), Part 3 (public persona / forward look), Outro
18. Post production — vibe check

TONE RULES:
- British English throughout
- Warm, direct, emotionally intelligent
- Questions must feel specifically researched for this guest, never generic
- Always thread Matt's own recovery experience through the connective tissue of the interview
- Respect any sensitivities listed — never include questions or talking points that breach them

Produce the brief in plain text with bold headings (use ** for bold). No preamble, no explanation — just the brief.`;

  const userPrompt = `Generate a full On The Mend guest brief for the following:

GUEST: ${inputs.guestName}
RECORDING: ${inputs.recordingDate}
PROMOTING: ${inputs.promoting}
EPISODE ANGLE: ${inputs.angle}
EPISODE TYPE: ${inputs.episodeType}
SENSITIVITIES / OFF-LIMITS: ${inputs.sensitivities || 'None specified'}
TONE STEER: ${inputs.tone || 'Not specified'}
TARGET AUDIENCE: ${inputs.targetAudience || 'Not specified'}
AUDIENCE SCORES: ${inputs.audienceScores || 'Not specified'}
MATT\'S RELATIONSHIP WITH GUEST: ${inputs.relationship || 'Not specified'}
UNIQUE UNMISSABLE MOMENT: ${inputs.unmissable || 'To be identified from research'}
COMMUNITY ENGAGEMENT IDEAS: ${inputs.communityIdeas || 'None specified'}
HIGH-PERFORMING SOCIAL CONTENT: ${inputs.socialContent || 'Not specified'}
LINKS TO WATCH: ${inputs.watchLinks || 'None provided'}
PRODUCER / TEAM NOTES: ${inputs.producerNotes || 'None'}
ANYTHING ELSE: ${inputs.anythingElse || 'None'}

Now generate the complete brief.`;

  const body = JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  try {
    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve({ status: response.statusCode, body: data }));
      });

      request.on('error', reject);
      request.write(body);
      request.end();
    });

    const parsed = JSON.parse(result.body);

    if (result.status !== 200) {
      return res.status(result.status).json({ error: parsed.error?.message || 'API error' });
    }

    const text = parsed.content?.map(b => b.text || '').join('') || '';
    return res.status(200).json({ brief: text });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
