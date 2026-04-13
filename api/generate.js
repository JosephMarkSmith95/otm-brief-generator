const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { inputs } = req.body || {};
  if (!inputs) return res.status(400).json({ error: 'Missing inputs' });

  const systemPrompt = `You are the interview producer for "On The Mend" — a podcast hosted by Matt Willis (former Busted member, recovering alcoholic) about mental health, addiction, and resilience.

A producer will give you a dump of raw research notes — social content, YouTube links, booking emails, their own thoughts, anything. Your job is to read all of it and produce three things only:

1. EPISODE ANGLE
One sharp editorial sentence. Not a bio summary. The emotional or narrative hook that makes this episode unmissable.

2. KEY TALKING POINTS
Exactly 3 bullet points. Each one is a specific, researched angle unique to this guest — not generic recovery show topics. Order them by priority for retention.

3. FULL INTERVIEW STRUCTURE
Write the complete interview plan for Matt, structured as:

- Welcome / intro (how Matt should open, referencing any existing relationship with the guest)
- Part 1: [title] — the depths of their story. 8-12 specific, researched questions. Not generic. Reference real moments, quotes, events from the research notes.
- Part 2: [title] — the turning point and recovery. 6-10 specific questions.
- Part 3: [title] — life now, forward look, what they are promoting. 5-8 questions.
- Outro — how Matt should close, what to plug, sign-off line.

RULES:
- British English throughout
- Every question must feel like it was written specifically for this guest — never generic
- Where the research mentions a specific story, quote, or moment, build a question directly around it
- Thread Matt's own recovery experience through the interview as connective tissue — he is not just a host, he is a fellow addict
- If the research notes mention sensitivities or off-limits topics, respect them completely
- No preamble, no explanation — output the three sections only, clearly headed`;

  const userPrompt = `GUEST: ${inputs.guestName}
RECORDING: ${inputs.recordingDate}

PRODUCER RESEARCH NOTES:
${inputs.researchDump}

Now generate the episode angle, key talking points, and full interview structure.`;

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
