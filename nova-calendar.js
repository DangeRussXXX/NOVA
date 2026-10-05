/* ============================================================
   NOVA CALENDAR
   Extracted from the browser-confirmed Step 3 index.
   ============================================================ */

/* ============================================================
   CALENDAR
   ============================================================ */

let calendarDate = new Date();

let calendarEvents =
  JSON.parse(
    localStorage.getItem("amomiiCalendarEvents") || "[]"
  );

/* ============================================================
   CALENDAR
   ============================================================ */

let novaCalendarPopupWindow = null;

function novaCalendarDocument(){
  try{
    if(novaCalendarPopupWindow && !novaCalendarPopupWindow.closed){
      return novaCalendarPopupWindow.document;
    }
  }catch(e){}
  return document;
}


function saveEvents(){

  localStorage.setItem(
    "amomiiCalendarEvents",
    JSON.stringify(calendarEvents)
  );

}


let calendarView = "month";
let selectedCalendarDate = new Date();


function calendarToday(){

  calendarDate = new Date();
  selectedCalendarDate = new Date();
  renderCalendar();

}


function refreshCalendar(){

  calendarEvents =
    JSON.parse(
      localStorage.getItem("amomiiCalendarEvents") || "[]"
    );

  renderCalendar();

  log(
    "NOVA Calendar refreshed.",
    "system"
  );

}


function calendarOutlookInfo(){

  speak(
    "NOVA Calendar is ready for Outlook connection. Microsoft account authorization is the next integration step."
  );

  log(
    "Outlook connection is not active yet. Calendar is currently using local storage.",
    "warning"
  );

}


function setCalendarView(view){

  if(
    !["day","week","month","agenda"].includes(view)
  ){
    return;
  }

  calendarView = view;

  [
    "Day",
    "Week",
    "Month",
    "Agenda"
  ].forEach(name => {

    const button =
      novaCalendarDocument().getElementById(
        `calendarView${name}`
      );

    if(button){
      button.classList.toggle(
        "active",
        name.toLowerCase() === view
      );
    }

  });

  renderCalendar();

}


function changeCalendarPeriod(amount){

  if(calendarView === "month"){

    calendarDate.setMonth(
      calendarDate.getMonth() + amount
    );

  }else if(calendarView === "week"){

    calendarDate.setDate(
      calendarDate.getDate() + (amount * 7)
    );

  }else{

    calendarDate.setDate(
      calendarDate.getDate() + amount
    );

  }

  selectedCalendarDate =
    new Date(calendarDate);

  renderCalendar();

}


function changeMonth(amount){

  calendarDate.setMonth(
    calendarDate.getMonth() + amount
  );

  selectedCalendarDate =
    new Date(calendarDate);

  renderCalendar();

}


function startOfWeek(date){

  const result =
    new Date(date);

  result.setHours(0,0,0,0);
  result.setDate(
    result.getDate() - result.getDay()
  );

  return result;

}


function renderCalendar(){

  const grid =
    novaCalendarDocument().getElementById(
      "calendarGrid"
    );

  if(!grid){
    return;
  }

  grid.className =
    "calendarGrid";

  grid.innerHTML = "";

  if(calendarView === "month"){
    renderCalendarMonth(grid);
  }else if(calendarView === "week"){
    renderCalendarWeek(grid);
  }else if(calendarView === "day"){
    renderCalendarDay(grid);
  }else{
    renderCalendarAgenda(grid);
  }

  renderEventList();

}


function updateCalendarHeading(text){

  const heading =
    novaCalendarDocument().getElementById(
      "calendarMonth"
    );

  if(heading){
    heading.textContent = text;
  }

}


function renderCalendarMonth(grid){

  const year =
    calendarDate.getFullYear();

  const month =
    calendarDate.getMonth();

  updateCalendarHeading(
    calendarDate.toLocaleDateString(
      [],
      {
        month:"long",
        year:"numeric"
      }
    )
  );

  [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
  ].forEach(day => {

    const label =
      novaCalendarDocument().createElement("div");

    label.className =
      "dayLabel";

    label.textContent =
      day;

    grid.appendChild(label);

  });

  const firstDay =
    new Date(
      year,
      month,
      1
    ).getDay();

  const daysInMonth =
    new Date(
      year,
      month + 1,
      0
    ).getDate();

  for(
    let i=0;
    i<firstDay;
    i++
  ){

    grid.appendChild(
      novaCalendarDocument().createElement("div")
    );

  }

  for(
    let day=1;
    day<=daysInMonth;
    day++
  ){

    appendCalendarDayCell(
      grid,
      new Date(
        year,
        month,
        day
      )
    );

  }

}


function renderCalendarWeek(grid){

  grid.classList.add(
    "weekView"
  );

  const start =
    startOfWeek(calendarDate);

  const end =
    new Date(start);

  end.setDate(
    end.getDate() + 6
  );

  updateCalendarHeading(
    `${start.toLocaleDateString([],{
      month:"short",
      day:"numeric"
    })} – ${end.toLocaleDateString([],{
      month:"short",
      day:"numeric",
      year:"numeric"
    })}`
  );

  for(
    let i=0;
    i<7;
    i++
  ){

    const date =
      new Date(start);

    date.setDate(
      start.getDate() + i
    );

    const label =
      novaCalendarDocument().createElement("div");

    label.className =
      "dayLabel";

    label.textContent =
      date.toLocaleDateString(
        [],
        {
          weekday:"short"
        }
      );

    grid.appendChild(label);

  }

  for(
    let i=0;
    i<7;
    i++
  ){

    const date =
      new Date(start);

    date.setDate(
      start.getDate() + i
    );

    appendCalendarDayCell(
      grid,
      date,
      true
    );

  }

}


function renderCalendarDay(grid){

  grid.classList.add(
    "dayView"
  );

  updateCalendarHeading(
    calendarDate.toLocaleDateString(
      [],
      {
        weekday:"long",
        month:"long",
        day:"numeric",
        year:"numeric"
      }
    )
  );

  appendCalendarDayCell(
    grid,
    new Date(calendarDate),
    true
  );

}


function renderCalendarAgenda(grid){

  grid.classList.add(
    "agendaView"
  );

  updateCalendarHeading(
    "Upcoming Agenda"
  );

  const wrapper =
    novaCalendarDocument().createElement("div");

  wrapper.className =
    "calendarListView";

  const start =
    new Date(calendarDate);

  start.setHours(0,0,0,0);

  let rendered = 0;

  for(
    let i=0;
    i<30;
    i++
  ){

    const date =
      new Date(start);

    date.setDate(
      start.getDate() + i
    );

    const events =
      getEventsForDate(date)
        .sort(compareCalendarEvents);

    if(!events.length){
      continue;
    }

    rendered++;

    const day =
      novaCalendarDocument().createElement("div");

    day.className =
      "calendarListDay";

    const title =
      novaCalendarDocument().createElement("div");

    title.className =
      "calendarListDayTitle";

    title.textContent =
      date.toLocaleDateString(
        [],
        {
          weekday:"short",
          month:"short",
          day:"numeric"
        }
      );

    day.appendChild(title);

    events.forEach(event => {

      const item =
        novaCalendarDocument().createElement("div");

      item.className =
        "event";

      item.onclick =
        () => openCalendarEditor(event.id);

      item.innerHTML =
        `<div class="eventTitle">${escapeHtml(event.title)}</div>
         <div class="eventMeta">${
           event.time
             ? escapeHtml(formatTime(event.time))
             : "All day"
         }</div>`;

      day.appendChild(item);

    });

    wrapper.appendChild(day);

  }

  if(!rendered){

    const empty =
      novaCalendarDocument().createElement("div");

    empty.style.color =
      "var(--muted)";

    empty.style.fontSize =
      "11px";

    empty.textContent =
      "No events in the next 30 days.";

    wrapper.appendChild(empty);

  }

  grid.appendChild(wrapper);

}


function appendCalendarDayCell(
  grid,
  date,
  showMonth=false
){

  const cell =
    novaCalendarDocument().createElement("div");

  cell.className =
    "day";

  cell.dataset.date =
    dateKey(date);

  if(
    dateKey(date) ===
    dateKey(new Date())
  ){
    cell.classList.add(
      "today"
    );
  }

  if(
    dateKey(date) ===
    dateKey(selectedCalendarDate)
  ){
    cell.classList.add(
      "selected"
    );
  }

  cell.onclick = () => {

    selectedCalendarDate =
      new Date(date);

    calendarDate =
      new Date(date);

    renderCalendar();

  };

  cell.ondblclick = () => {

    selectedCalendarDate =
      new Date(date);

    openCalendarEditor();

  };

  const number =
    novaCalendarDocument().createElement("div");

  number.className =
    "dayNumber";

  number.textContent =
    showMonth
      ? date.toLocaleDateString(
          [],
          {
            month:"short",
            day:"numeric"
          }
        )
      : date.getDate();

  cell.appendChild(number);

  const events =
    getEventsForDate(date)
      .sort(compareCalendarEvents);

  events
    .slice(0,4)
    .forEach(event => {

      const eventDiv =
        novaCalendarDocument().createElement("div");

      eventDiv.className =
        "eventDot";

      eventDiv.textContent =
        `${event.time ? formatTime(event.time) + " " : ""}${event.title}`;

      eventDiv.onclick = clickEvent => {

        clickEvent.stopPropagation();
        openCalendarEditor(
          event.id
        );

      };

      cell.appendChild(
        eventDiv
      );

    });

  if(events.length > 4){

    const more =
      novaCalendarDocument().createElement("div");

    more.className =
      "eventDot";

    more.textContent =
      `+${events.length - 4} more`;

    cell.appendChild(more);

  }

  grid.appendChild(cell);

}


function dateKey(date){

  const y =
    date.getFullYear();

  const m =
    String(
      date.getMonth()+1
    ).padStart(2,"0");

  const d =
    String(
      date.getDate()
    ).padStart(2,"0");

  return `${y}-${m}-${d}`;

}


function getEventsForDate(date){

  return calendarEvents.filter(
    event =>
      event.date === dateKey(date)
  );

}


function compareCalendarEvents(a,b){

  return String(
    a.time || ""
  ).localeCompare(
    String(
      b.time || ""
    )
  );

}


function renderEventList(){

  const list =
    novaCalendarDocument().getElementById(
      "eventList"
    );

  if(!list){
    return;
  }

  list.innerHTML = "";

  const date =
    selectedCalendarDate ||
    new Date();

  const heading =
    novaCalendarDocument().createElement("div");

  heading.className =
    "eventListHeading";

  heading.textContent =
    `EVENTS • ${date.toLocaleDateString([],{
      weekday:"long",
      month:"long",
      day:"numeric"
    }).toUpperCase()}`;

  list.appendChild(heading);

  const events =
    getEventsForDate(date)
      .sort(compareCalendarEvents);

  if(!events.length){

    const empty =
      novaCalendarDocument().createElement("div");

    empty.style.color =
      "var(--muted)";

    empty.style.fontSize =
      "11px";

    empty.textContent =
      "No events scheduled.";

    list.appendChild(empty);

    return;
  }

  events.forEach(event => {

    const div =
      novaCalendarDocument().createElement("div");

    div.className =
      "event";

    div.onclick =
      () => openCalendarEditor(event.id);

    div.innerHTML =
      `<div class="eventTitle">
        ${escapeHtml(event.title)}
      </div>
      <div class="eventMeta">
        ${escapeHtml(event.date)}
        ${
          event.time
            ? " • " + escapeHtml(formatTime(event.time))
            : " • All day"
        }
        ${
          event.endTime
            ? " – " + escapeHtml(formatTime(event.endTime))
            : ""
        }
      </div>`;

    list.appendChild(div);

  });

}


function addEvent(
  title,
  date,
  time="",
  endTime="",
  notes=""
){

  const event = {
    id:
      Date.now() +
      Math.random(),

    title:
      title.trim(),

    date,

    time,

    endTime,

    notes,

    calendar:"NOVA"
  };

  calendarEvents.push(
    event
  );

  selectedCalendarDate =
    new Date(
      `${date}T12:00:00`
    );

  calendarDate =
    new Date(
      selectedCalendarDate
    );

  saveEvents();
  renderCalendar();

  log(
    `Calendar event added: ${title} on ${date}${time ? " at " + time : ""}`,
    "success"
  );

  return event;

}


function openCalendarEditor(eventId=null){

  const modal =
    novaCalendarDocument().getElementById(
      "calendarModal"
    );

  const event =
    eventId !== null
      ? calendarEvents.find(
          item =>
            String(item.id) ===
            String(eventId)
        )
      : null;

  novaCalendarDocument().getElementById(
    "calendarEditorTitle"
  ).textContent =
    event
      ? "EDIT CALENDAR EVENT"
      : "NEW CALENDAR EVENT";

  novaCalendarDocument().getElementById(
    "calendarEventId"
  ).value =
    event
      ? event.id
      : "";

  novaCalendarDocument().getElementById(
    "calendarEventTitle"
  ).value =
    event
      ? event.title || ""
      : "";

  novaCalendarDocument().getElementById(
    "calendarEventDate"
  ).value =
    event
      ? event.date
      : dateKey(
          selectedCalendarDate ||
          new Date()
        );

  novaCalendarDocument().getElementById(
    "calendarEventTime"
  ).value =
    event
      ? event.time || ""
      : "";

  novaCalendarDocument().getElementById(
    "calendarEventEndTime"
  ).value =
    event
      ? event.endTime || ""
      : "";

  novaCalendarDocument().getElementById(
    "calendarEventNotes"
  ).value =
    event
      ? event.notes || ""
      : "";

  novaCalendarDocument().getElementById(
    "calendarDeleteButton"
  ).style.display =
    event
      ? ""
      : "none";

  modal.classList.add(
    "open"
  );

  setTimeout(
    () =>
      novaCalendarDocument().getElementById(
        "calendarEventTitle"
      ).focus(),
    0
  );

}


function closeCalendarEditor(){

  novaCalendarDocument().getElementById(
    "calendarModal"
  ).classList.remove(
    "open"
  );

}


function calendarModalBackdrop(event){

  if(
    event.target.id ===
    "calendarModal"
  ){
    closeCalendarEditor();
  }

}


function saveCalendarEventFromEditor(){

  const id =
    novaCalendarDocument().getElementById(
      "calendarEventId"
    ).value;

  const title =
    novaCalendarDocument().getElementById(
      "calendarEventTitle"
    ).value.trim();

  const date =
    novaCalendarDocument().getElementById(
      "calendarEventDate"
    ).value;

  const time =
    novaCalendarDocument().getElementById(
      "calendarEventTime"
    ).value;

  const endTime =
    novaCalendarDocument().getElementById(
      "calendarEventEndTime"
    ).value;

  const notes =
    novaCalendarDocument().getElementById(
      "calendarEventNotes"
    ).value.trim();

  if(!title || !date){

    speak(
      "The event needs a title and date."
    );

    return;
  }

  if(id){

    const event =
      calendarEvents.find(
        item =>
          String(item.id) ===
          String(id)
      );

    if(event){

      event.title = title;
      event.date = date;
      event.time = time;
      event.endTime = endTime;
      event.notes = notes;

      log(
        `Calendar event updated: ${title}`,
        "success"
      );

    }

  }else{

    addEvent(
      title,
      date,
      time,
      endTime,
      notes
    );

  }

  selectedCalendarDate =
    new Date(
      `${date}T12:00:00`
    );

  calendarDate =
    new Date(
      selectedCalendarDate
    );

  saveEvents();
  closeCalendarEditor();
  renderCalendar();

}


function deleteCalendarEventFromEditor(){

  const id =
    novaCalendarDocument().getElementById(
      "calendarEventId"
    ).value;

  if(!id){
    return;
  }

  const event =
    calendarEvents.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if(
    !confirm(
      `Delete ${event ? event.title : "this event"}?`
    )
  ){
    return;
  }

  calendarEvents =
    calendarEvents.filter(
      item =>
        String(item.id) !==
        String(id)
    );

  saveEvents();
  closeCalendarEditor();
  renderCalendar();

  speak(
    "Calendar event deleted."
  );

}


/* ============================================================
   NATURAL LANGUAGE CALENDAR
   ============================================================ */

function createEventFromNaturalLanguage(text){

  const raw =
    text.trim();

  let working =
    raw;

  let date =
    new Date();

  date.setHours(
    12,0,0,0
  );

  let dateWasFound =
    false;

  /*
    TODAY / TOMORROW / DAY AFTER TOMORROW
  */
  if(
    /\bday after tomorrow\b/i.test(working)
  ){

    date.setDate(
      date.getDate() + 2
    );

    working =
      working.replace(
        /\bday after tomorrow\b/ig,
        " "
      );

    dateWasFound = true;

  }else if(
    /\btomorrow\b/i.test(working)
  ){

    date.setDate(
      date.getDate() + 1
    );

    working =
      working.replace(
        /\btomorrow\b/ig,
        " "
      );

    dateWasFound = true;

  }else if(
    /\btoday\b/i.test(working)
  ){

    working =
      working.replace(
        /\btoday\b/ig,
        " "
      );

    dateWasFound = true;

  }


  /*
    MONTH NAME DATES:
    October 5
    October 5th
    October 5th 2026
    Oct 5 at 5 PM
  */
  const monthNumbers = {
    january:0,
    jan:0,
    february:1,
    feb:1,
    march:2,
    mar:2,
    april:3,
    apr:3,
    may:4,
    june:5,
    jun:5,
    july:6,
    jul:6,
    august:7,
    aug:7,
    september:8,
    sept:8,
    sep:8,
    october:9,
    oct:9,
    november:10,
    nov:10,
    december:11,
    dec:11
  };

  const monthDateMatch =
    working.match(
      /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?\b/i
    );

  if(monthDateMatch){

    const month =
      monthNumbers[
        monthDateMatch[1]
          .toLowerCase()
      ];

    const day =
      Number(
        monthDateMatch[2]
      );

    let year =
      monthDateMatch[3]
        ? Number(
            monthDateMatch[3]
          )
        : date.getFullYear();

    const candidate =
      new Date(
        year,
        month,
        day,
        12,0,0,0
      );

    /*
      If no year was spoken and that date has already
      passed this year, use next year.
    */
    if(
      !monthDateMatch[3] &&
      candidate <
        new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          new Date().getDate(),
          0,0,0,0
        )
    ){

      candidate.setFullYear(
        year + 1
      );

    }

    date =
      candidate;

    working =
      working.replace(
        monthDateMatch[0],
        " "
      );

    dateWasFound = true;

  }


  /*
    NUMERIC DATES:
    10/5
    10-5-2026
  */
  if(!dateWasFound){

    const dateMatch =
      working.match(
        /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/
      );

    if(dateMatch){

      let year =
        dateMatch[3]
          ? Number(
              dateMatch[3]
            )
          : date.getFullYear();

      if(year < 100){
        year += 2000;
      }

      date =
        new Date(
          year,
          Number(dateMatch[1])-1,
          Number(dateMatch[2]),
          12,0,0,0
        );

      working =
        working.replace(
          dateMatch[0],
          " "
        );

      dateWasFound = true;

    }

  }


  /*
    WEEKDAY DATES:
    Friday
    this Friday
    next Friday
  */
  if(!dateWasFound){

    const weekdayNumbers = {
      sunday:0,
      monday:1,
      tuesday:2,
      wednesday:3,
      thursday:4,
      friday:5,
      saturday:6
    };

    const weekdayMatch =
      working.match(
        /\b(?:(next|this)\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i
      );

    if(weekdayMatch){

      const qualifier =
        (
          weekdayMatch[1] ||
          ""
        ).toLowerCase();

      const targetDay =
        weekdayNumbers[
          weekdayMatch[2]
            .toLowerCase()
        ];

      const currentDay =
        date.getDay();

      let difference =
        (
          targetDay -
          currentDay +
          7
        ) % 7;

      if(
        qualifier === "next"
      ){

        difference +=
          difference === 0
            ? 7
            : 7;

      }else if(
        difference === 0
      ){

        difference = 7;

      }

      date.setDate(
        date.getDate() +
        difference
      );

      working =
        working.replace(
          weekdayMatch[0],
          " "
        );

      dateWasFound = true;

    }

  }


  /*
    SPOKEN TIME:
    5 PM
    5:00 PM
    5:00 p.m.
    at 5:30 a.m.
  */
  let time = "";

  const timeMatch =
    working.match(
      /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?)\b/i
    );

  if(timeMatch){

    let hour =
      Number(
        timeMatch[1]
      );

    const minute =
      timeMatch[2] ||
      "00";

    const ampm =
      timeMatch[3]
        .toLowerCase()
        .replace(
          /[\s.]/g,
          ""
        );

    if(
      ampm === "pm" &&
      hour < 12
    ){
      hour += 12;
    }

    if(
      ampm === "am" &&
      hour === 12
    ){
      hour = 0;
    }

    time =
      `${String(hour).padStart(2,"0")}:${minute}`;

    working =
      working.replace(
        timeMatch[0],
        " "
      );

  }


  /*
    REMOVE COMMAND WORDS AFTER DATE/TIME HAVE BEEN PARSED.
  */
  let title =
    working
      .replace(
        /\b(?:add|schedule|create)\b/ig,
        " "
      )
      .replace(
        /\b(?:an\s+)?event\b/ig,
        " "
      )
      .replace(
        /\b(?:on|for)\b(?=\s*$)/ig,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim()
      .replace(
        /^[\s.,!?;:]+|[\s.,!?;:]+$/g,
        ""
      )
      .trim();

  if(
    !title ||
    title.length < 2
  ){

    awaitingEvent = true;

    speak(
      "What would you like the event to be called?"
    );

    return;

  }

  const created =
    addEvent(
      title,
      dateKey(date),
      time
    );

  speak(
    `I added ${created.title} for ${
      date.toLocaleDateString([],{
        month:"long",
        day:"numeric",
        year:"numeric"
      })
    }${
      time
        ? ` at ${formatTime(time)}`
        : ""
    }.`
  );

}


function voiceAddEvent(){

  awaitingEvent = true;

  /*
    Make sure the browser SpeechRecognition object actually
    exists before the calendar enables the recognition loop.
  */
  if(!recognition){
    initializeVoice();
  }

  if(!recognition){

    awaitingEvent = false;

    log(
      "Voice recognition could not be initialized.",
      "error"
    );

    speak(
      "Voice recognition is not available in this browser."
    );

    return;
  }

  if(!voiceEnabled){

    voiceEnabled = true;
    updateVoiceUI();

    log(
      "Voice control enabled for calendar event capture.",
      "success"
    );

  }

  speak(
    "Tell me the event, date, and time."
  );

}


function formatTime(time){

  if(!time){
    return "";
  }

  const parts =
    time.split(":");

  const date =
    new Date();

  date.setHours(
    Number(parts[0]),
    Number(parts[1] || 0)
  );

  return date.toLocaleTimeString(
    [],
    {
      hour:"numeric",
      minute:"2-digit"
    }
  );

}


function speakTodaysEvents(){

  const today =
    new Date();

  const events =
    getEventsForDate(today)
      .sort(compareCalendarEvents);

  if(!events.length){

    speak(
      `You have no events scheduled for today, ${userName}.`
    );

    return;
  }

  const descriptions =
    events.map(
      event =>
        `${event.title}${
          event.time
            ? ` at ${formatTime(event.time)}`
            : ""
        }`
    );

  speak(
    `Today you have ${descriptions.join(", and ")}.`
  );

}


function addTestEvent(){

  const date =
    new Date();

  addEvent(
    "AMOMII ONE Test Event",
    dateKey(date),
    "12:00"
  );

}


function clearEvents(){

  if(
    !confirm(
      "Clear all NOVA calendar events?"
    )
  ){
    return;
  }

  calendarEvents = [];

  saveEvents();
  renderCalendar();

  speak(
    "All calendar events have been cleared."
  );

}


function openNovaCalendarScreen(){
  const panel=document.getElementById("novaCalendarPanelSource");
  const modal=document.getElementById("calendarModal");
  if(!panel)return;
  const w=window.open("","nova_calendar_screen","width=1180,height=820,resizable=yes,scrollbars=yes");
  if(!w){log("NOVA Calendar screen was blocked. Allow pop-ups for this page.","warning");return;}
  novaCalendarPopupWindow=w;
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>NOVA CALENDAR</title></head><body style="margin:0;padding:16px;background:#070a0f;color:#d9e4ef"><div style="text-align:right;margin-bottom:10px"><button onclick="window.close()">CLOSE CALENDAR</button></div><div id="calendarHost"></div><div id="calendarModalHost"></div></body></html>`);
  w.document.close();
  const novaCssLink=w.document.createElement("link");
  novaCssLink.rel="stylesheet";
  novaCssLink.href=new URL("nova.css",window.location.href).href;
  w.document.head.appendChild(novaCssLink);
  ["calendarOutlookInfo","calendarToday","openCalendarEditor","refreshCalendar","setCalendarView","changeCalendarPeriod","voiceAddEvent","speakTodaysEvents","calendarModalBackdrop","deleteCalendarEventFromEditor","closeCalendarEditor","saveCalendarEventFromEditor"].forEach(name=>{if(typeof window[name]==="function")w[name]=window[name];});
  panel.style.display="block";
  w.document.getElementById("calendarHost").appendChild(w.document.adoptNode(panel));
  if(modal)w.document.getElementById("calendarModalHost").appendChild(w.document.adoptNode(modal));
  renderCalendar();
  w.addEventListener("beforeunload",()=>{
    novaCalendarPopupWindow=null;
    const stack=document.querySelector(".novaPanelStack");
    if(stack){document.adoptNode(panel);panel.style.display="none";stack.insertBefore(panel,stack.firstChild);}
    if(modal){document.adoptNode(modal);const app=document.querySelector(".app");if(app)app.appendChild(modal);}
  },{once:true});
  try{w.focus()}catch(e){}
}
