import fetch from 'node-fetch';
import ical from 'ical.js';

// Parses Outlook/Teams .ics calendar feed and extracts active assignment deadlines
export async function fetchMicrosoftDeadlines(calendarUrl) {
  console.log(`📅 Fetching Microsoft Calendar feed from: ${calendarUrl.substring(0, 80)}...`);
  
  const resp = await fetch(calendarUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/calendar'
    },
    timeout: 15000
  });

  if (!resp.ok) {
    throw new Error(`Failed to retrieve calendar feed (HTTP status ${resp.status})`);
  }

  const icsData = await resp.text();
  const jcalData = ical.parse(icsData);
  const comp = new ical.Component(jcalData);
  const vevents = comp.getAllSubcomponents('vevent');

  const now = new Date();
  const deadlines = [];

  for (const vevent of vevents) {
    const event = new ical.Event(vevent);
    const summary = event.summary || '';
    const description = event.description || '';
    const end = event.endDate ? event.endDate.toJSDate() : null;

    // Filter only events that are upcoming or recently passed (within last 7 days)
    // MS Teams assignment events usually contain "assignment", "due", "deadline", or quizzes
    const isDeadline = /assignment|due|quiz|deadline|homework|project|exam|submission/i.test(summary) ||
                       /assignment|due|deadline|teams/i.test(description);

    if (isDeadline && end && end > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) {
      deadlines.push({
        title: summary.replace(/due|assignment|deadline/i, '').replace(/[\(\[\{\)\]\}]/g, '').trim(),
        dueDate: end,
        description: description.trim().substring(0, 300),
        status: end > now ? 'upcoming' : 'completed',
        remainingMs: end.getTime() - now.getTime()
      });
    }
  }

  // Sort deadlines: nearest upcoming deadlines first
  deadlines.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  
  console.log(`✅ Parsed ${deadlines.length} assignment deadlines from Microsoft Teams calendar.`);
  return deadlines;
}
