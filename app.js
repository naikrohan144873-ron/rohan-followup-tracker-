/* app.js - main logic */
(() => {
  const LS_KEY = 'rohan_tasks_v1';
  const LS_SETTINGS = 'rohan_settings_v1';
  const companies = ['Greenland','Profusion','Other Projects'];
  const departments = ['Sales','Marketing','Admin','Laisoning','Others'];

  // Utilities
  const qs = s => document.querySelector(s);
  const qsa = s => document.querySelectorAll(s);
  const nowISO = ()=> new Date().toISOString();

  function getTasks(){ try{ return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }catch(e){return [];} }
  function saveTasks(ts){ localStorage.setItem(LS_KEY, JSON.stringify(ts)); }

  function getSettings(){ try{ return JSON.parse(localStorage.getItem(LS_SETTINGS) || '{}'); }catch(e){return {}; } }
  function saveSettings(s){ localStorage.setItem(LS_SETTINGS, JSON.stringify(s)); }

  // Common UI: modal
  function showModal(html){
    const root = document.getElementById('modalRoot');
    root.innerHTML = '<div class="modal-backdrop"><div class="modal">'+html+'</div></div>';
    root.style.display = 'block';
    root.querySelector('.modal-backdrop').addEventListener('click', (e)=>{ if(e.target.classList.contains('modal-backdrop')) closeModal(); });
  }
  function closeModal(){ const root=document.getElementById('modalRoot'); root.innerHTML=''; root.style.display='none'; }

  // Date helpers
  function dateTimeToDateObj(dateStr,timeStr){
    if(!dateStr || !timeStr) return null;
    return new Date(dateStr + 'T' + timeStr);
  }
  function isOverdue(task){
    const dt = dateTimeToDateObj(task.followDate, task.followTime);
    if(!dt) return false;
    return new Date() > dt && task.status !== 'Completed';
  }
  function isToday(task){
    const dt = dateTimeToDateObj(task.followDate, task.followTime);
    if(!dt) return false;
    const t = new Date();
    return dt.getFullYear()===t.getFullYear() && dt.getMonth()===t.getMonth() && dt.getDate()===t.getDate();
  }

  // Render functions for pages
  function renderDashboard(){
    if(!document.body.contains(qs('#todayCount'))) return;
    const tasks = getTasks();
    const today = tasks.filter(isToday);
    const pending = tasks.filter(t=> t.status !== 'Completed' && !isOverdue(t));
    const completed = tasks.filter(t=> t.status === 'Completed');
    const overdue = tasks.filter(isOverdue);

    qs('#todayCount').textContent = today.length;
    qs('#pendingCount').textContent = pending.length;
    qs('#completedCount').textContent = completed.length;
    qs('#overdueCount').textContent = overdue.length;

    // Populate filters
    const compSel = qs('#filterCompany');
    if (compSel && compSel.options.length <= 1) {
      companies.forEach(c => { const o = document.createElement('option'); o.value=c; o.textContent=c; compSel.appendChild(o); });
    }
    const deptSel = qs('#filterDept');
    if (deptSel && deptSel.options.length <= 1) {
      departments.forEach(d => { const o = document.createElement('option'); o.value=d; o.textContent=d; deptSel.appendChild(o); });
    }

    // Build task list with filters
    let list = tasks.slice().sort((a,b) => {
      const da = dateTimeToDateObj(a.followDate,a.followTime) || new Date(a.createdAt);
      const db = dateTimeToDateObj(b.followDate,b.followTime) || new Date(b.createdAt);
      return da - db;
    });

    // Apply search & filters
    const search = qs('#searchInput') ? qs('#searchInput').value.toLowerCase() : '';
    const fComp = qs('#filterCompany') ? qs('#filterCompany').value : '';
    const fDept = qs('#filterDept') ? qs('#filterDept').value : '';
    const fStatus = qs('#filterStatus') ? qs('#filterStatus').value : '';
    const fDate = qs('#filterDate') ? qs('#filterDate').value : '';

    list = list.filter(t=>{
      if(fComp && t.company!==fComp) return false;
      if(fDept && t.department!==fDept) return false;
      if(fStatus && t.status!==fStatus) return false;
      if(fDate && t.followDate!==fDate) return false;
      if(search){
        const hay = (t.personName + ' ' + t.company + ' ' + t.department).toLowerCase();
        return hay.indexOf(search) !== -1;
      }
      return true;
    });

    const container = qs('#taskSection');
    container.innerHTML = '';
    if(list.length===0){ container.innerHTML = '<div class="small">No tasks found.</div>'; return; }

    // Overdue tasks on top
    list.sort((a,b)=> {
      const ao = isOverdue(a) ? 0:1;
      const bo = isOverdue(b) ? 0:1;
      if(ao!==bo) return ao-bo;
      const da = dateTimeToDateObj(a.followDate,a.followTime) || new Date(a.createdAt);
      const db = dateTimeToDateObj(b.followDate,b.followTime) || new Date(b.createdAt);
      return da - db;
    });

    list.forEach(t=>{
      const div = document.createElement('div');
      div.className = 'task-card' + (isOverdue(t)?' overdue':'');
      div.innerHTML = `
        <div class="task-top">
          <div>
            <div class="task-title">${escapeHtml(t.personName)}</div>
            <div class="task-meta">${escapeHtml(t.company)} • ${escapeHtml(t.department)}</div>
          </div>
          <div class="task-actions">
            <div class="badge">${escapeHtml(t.status)}</div>
          </div>
        </div>
        <div class="small">${t.followDate || '?'} ${t.followTime || ''}</div>
        <div class="small">${escapeHtml(t.notes || '')}</div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="btn" data-action="edit" data-id="${t.id}">Edit</button>
          <button class="btn btn-danger" data-action="delete" data-id="${t.id}">Delete</button>
          ${t.status!=='Completed'?'<button class="btn" data-action="complete" data-id="'+t.id+'">Mark Completed</button>':''}
        </div>
      `;
      container.appendChild(div);
    });
  }

  function renderListPage(){
    if(!document.body.contains(qs('#allTasks'))) return;
    const tasks = getTasks().slice().sort((a,b)=> {
      const da = dateTimeToDateObj(a.followDate,a.followTime) || new Date(a.createdAt);
      const db = dateTimeToDateObj(b.followDate,b.followTime) || new Date(b.createdAt);
      return da - db;
    });
    const container = qs('#allTasks');
    const search = qs('#searchList') ? qs('#searchList').value.toLowerCase() : '';
    container.innerHTML = '';
    if(tasks.length===0){ container.innerHTML = '<div class="small">No tasks yet. Add one!</div>'; return; }
    tasks.forEach(t=>{
      if(search){
        const hay = (t.personName + ' ' + t.company + ' ' + t.department + ' ' + (t.notes||'')).toLowerCase();
        if(hay.indexOf(search)===-1) return;
      }
      const div = document.createElement('div');
      div.className = 'task-card' + (isOverdue(t)?' overdue':'');
      div.innerHTML = `
        <div class="task-top">
          <div>
            <div class="task-title">${escapeHtml(t.personName)}</div>
            <div class="task-meta">${escapeHtml(t.company)} • ${escapeHtml(t.department)}</div>
          </div>
          <div class="task-actions">
            <div class="badge">${escapeHtml(t.status)}</div>
          </div>
        </div>
        <div class="small">${t.followDate || '?'} ${t.followTime || ''}</div>
        <div class="small">${escapeHtml(t.notes || '')}</div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="btn" data-action="edit" data-id="${t.id}">Edit</button>
          <button class="btn btn-danger" data-action="delete" data-id="${t.id}">Delete</button>
          ${t.status!=='Completed'?'<button class="btn" data-action="complete" data-id="'+t.id+'">Mark Completed</button>':''}
        </div>
      `;
      container.appendChild(div);
    });
  }

  function escapeHtml(str){
    if(!str) return '';
    return str.replace(/[&<>"'`]/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'})[m]; });
  }

  // Handle actions delegated from lists
  function setupDelegation(){
    document.body.addEventListener('click', (e)=>{
      const btn = e.target.closest('button');
      if(!btn) return;
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      if(action==='edit') openEdit(id);
      if(action==='delete') {
        if(confirm('Delete this task?')){
          deleteTask(id);
          renderDashboard(); renderListPage();
        }
      }
      if(action==='complete') {
        markCompleted(id);
        renderDashboard(); renderListPage();
      }
    });
  }

  function openEdit(id){
    const tasks = getTasks();
    const t = tasks.find(x=>x.id===id);
    if(!t) return alert('Task not found');
    const html = `
      <h3>Edit Follow-Up</h3>
      <form id="editForm" class="form">
        <label>Company
          <select id="e_company" class="input">
            ${companies.map(c=>'<option'+(c===t.company?' selected':'')+'>'+escapeHtml(c)+'</option>').join('')}
          </select>
        </label>
        <label>Department
          <select id="e_department" class="input">
            ${departments.map(d=>'<option'+(d===t.department?' selected':'')+'>'+escapeHtml(d)+'</option>').join('')}
          </select>
        </label>
        <label>Person Name
          <input id="e_personName" class="input" type="text" value="${escapeHtml(t.personName)}" />
        </label>
        <div style="display:flex;gap:8px;">
          <label style="flex:1">Follow-up Date
            <input id="e_followDate" class="input" type="date" value="${t.followDate || ''}" />
          </label>
          <label style="flex:1">Follow-up Time
            <input id="e_followTime" class="input" type="time" value="${t.followTime || ''}" />
          </label>
        </div>
        <label>Status
          <select id="e_status" class="input">
            <option${t.status==='Pending'?' selected':''}>Pending</option>
            <option${t.status==='In Progress'?' selected':''}>In Progress</option>
            <option${t.status==='Completed'?' selected':''}>Completed</option>
          </select>
        </label>
        <label>Notes
          <textarea id="e_notes" class="input">${escapeHtml(t.notes || '')}</textarea>
        </label>
        <div style="display:flex;gap:8px;">
          <button class="primary" type="submit">Save</button>
          <button type="button" id="cancelEdit" class="btn btn-danger">Cancel</button>
        </div>
      </form>
    `;
    showModal(html);
    document.getElementById('cancelEdit').addEventListener('click', closeModal);
    document.getElementById('editForm').addEventListener('submit', (ev)=>{
      ev.preventDefault();
      t.company = document.getElementById('e_company').value;
      t.department = document.getElementById('e_department').value;
      t.personName = document.getElementById('e_personName').value;
      t.followDate = document.getElementById('e_followDate').value;
      t.followTime = document.getElementById('e_followTime').value;
      t.status = document.getElementById('e_status').value;
      t.notes = document.getElementById('e_notes').value;
      saveTasks(getTasks().map(x=>x.id===t.id? t : x));
      closeModal();
      renderDashboard(); renderListPage();
    });
  }

  function addTaskFromForm(formEl){
    const company = formEl.querySelector('#company').value;
    const department = formEl.querySelector('#department').value;
    const personName = formEl.querySelector('#personName').value;
    const followDate = formEl.querySelector('#followDate').value;
    const followTime = formEl.querySelector('#followTime').value;
    const status = formEl.querySelector('#status').value;
    const notes = formEl.querySelector('#notes').value;
    const id = 't_'+Date.now();
    const task = {id, company, department, personName, followDate, followTime, status, notes, createdAt: nowISO() };
    const tasks = getTasks(); tasks.push(task); saveTasks(tasks);
    return task;
  }

  function deleteTask(id){
    const tasks = getTasks().filter(t=>t.id!==id);
    saveTasks(tasks);
  }
  function markCompleted(id){
    const tasks = getTasks().map(t => t.id===id? {...t, status:'Completed'}: t);
    saveTasks(tasks);
  }

  // Page wiring
  function wireIndex(){
    // bottom big add
    const addBtn = qs('#addBtn');
    if(addBtn) addBtn.addEventListener('click', ()=> location.href = '/add.html');

    // top (floating below header) add
    const addBtnFloating = qs('#addBtnFloating');
    if(addBtnFloating) addBtnFloating.addEventListener('click', ()=> location.href = '/add.html');

    const openList = qs('#openList'); if(openList) openList.addEventListener('click', ()=> location.href='/list.html');
    const openSettings = qs('#openSettings'); if(openSettings) openSettings.addEventListener('click', ()=> location.href='/settings.html');
    const navHome = qs('#navHome'); if(navHome) navHome.addEventListener('click', ()=> location.href='/index.html');
    const navList = qs('#navList'); if(navList) navList.addEventListener('click', ()=> location.href='/list.html');
    const navAbout = qs('#navAbout'); if(navAbout) navAbout.addEventListener('click', ()=> location.href='/about.html');

    ['searchInput','filterCompany','filterDept','filterStatus','filterDate'].forEach(id=>{
      const el = qs('#'+id); if(el) el.addEventListener('input', renderDashboard);
    });

    setupDelegation();
    renderDashboard();

    // in-app reminder at load (popup)
    setTimeout(()=> {
      const settings = getSettings();
      const tasks = getTasks().filter(isToday);
      if(tasks.length>0){
        const list = tasks.map(t=>`<div><strong>${escapeHtml(t.personName)}</strong> — ${escapeHtml(t.company)} ${t.followTime || ''} — ${escapeHtml(t.status)}</div>`).join('');
        showModal('<h3>Today\\'s Tasks</h3>' + list + '<div style="text-align:right;margin-top:8px;"><button class="primary" id="closeRem">OK</button></div>');
        document.getElementById('closeRem').addEventListener('click', closeModal);
      }
    }, 800);

    setInterval(renderDashboard, 30*1000);
  }

  function wireAdd(){
    const back = qs('#back'); if(back) back.addEventListener('click', ()=> location.href='/index.html');
    const form = qs('#followUpForm');
    if(form){
      form.addEventListener('submit', (ev)=>{
        ev.preventDefault();
        addTaskFromForm(form);
        location.href = '/index.html';
      });
    }
    const cancel = qs('#cancel'); if(cancel) cancel.addEventListener('click', ()=> location.href='/index.html');
  }

  function wireList(){
    const back = qs('#backList'); if(back) back.addEventListener('click', ()=> location.href='/index.html');
    const openAdd = qs('#openAdd'); if(openAdd) openAdd.addEventListener('click', ()=> location.href='/add.html');
    const navHome2 = qs('#navHome2'); if(navHome2) navHome2.addEventListener('click', ()=> location.href='/index.html');
    const navSettings2 = qs('#navSettings2'); if(navSettings2) navSettings2.addEventListener('click', ()=> location.href='/settings.html');
    const searchList = qs('#searchList'); if(searchList) searchList.addEventListener('input', renderListPage);
    setupDelegation();
    renderListPage();
    setInterval(renderListPage, 30*1000);
  }

  function wireSettings(){
    const back = qs('#backSettings'); if(back) back.addEventListener('click', ()=> location.href='/index.html');
    const reminder = qs('#reminderTime');
    const settings = getSettings();
    if(reminder && settings.reminderTime) reminder.value = settings.reminderTime;
    if(reminder) reminder.addEventListener('change', ()=> {
      const s = getSettings(); s.reminderTime = reminder.value; saveSettings(s);
      alert('Reminder time saved: ' + reminder.value);
    });
    const clearData = qs('#clearData'); if(clearData) clearData.addEventListener('click', ()=>{
      if(confirm('Clear ALL tasks? This cannot be undone.')){ localStorage.removeItem(LS_KEY); location.reload(); }
    });
    const requestNotif = qs('#requestNotif'); if(requestNotif) requestNotif.addEventListener('click', async ()=>{
      if(!('Notification' in window)) return alert('Notifications not supported in this browser.');
      const res = await Notification.requestPermission();
      if(res==='granted') alert('Notifications enabled. App will attempt to send daily reminders on Android.');
      else alert('Notifications permission denied.');
    });

    const themeToggle = qs('#themeToggle');
    if(themeToggle && settings.theme) themeToggle.value = settings.theme;
    if(themeToggle) themeToggle.addEventListener('change', ()=> {
      const s = getSettings(); s.theme = themeToggle.value; saveSettings(s);
      if(s.theme==='dark') document.documentElement.style.background='#0b1a2b';
      else document.documentElement.style.background='';
    });
  }

  function scheduleNotifications(){
    setInterval(async ()=>{
      const settings = getSettings();
      if(!settings.reminderTime) return;
      const now = new Date();
      const hhmm = now.toTimeString().slice(0,5);
      const lastFired = settings._lastFired || '';
      if(hhmm === settings.reminderTime && lastFired !== hhmm){
        settings._lastFired = hhmm; saveSettings(settings);
        const tasks = getTasks().filter(isToday);
        const title = tasks.length ? `You have ${tasks.length} follow-up(s) today` : `No follow-ups today`;
        const body = tasks.slice(0,5).map(t=>`${t.personName} @ ${t.company} ${t.followTime||''}`).join('\n');
        if(navigator.serviceWorker && navigator.serviceWorker.controller){
          navigator.serviceWorker.controller.postMessage({type:'SHOW_NOTIFICATION', payload:{title, options:{body, tag:'daily-reminder', renotify:true}}});
        } else if(navigator.serviceWorker && navigator.serviceWorker.getRegistration){
          const reg = await navigator.serviceWorker.getRegistration();
          if(reg) reg.showNotification(title, {body, tag:'daily-reminder', renotify:true});
        } else {
          if(document.body) showModal('<h3>'+title+'</h3><div style="white-space:pre-line;margin-top:8px;">'+body+'</div><div style="text-align:right;margin-top:8px;"><button class="primary" id="closeRem2">OK</button></div>');
          setTimeout(()=>{ const b=document.getElementById('closeRem2'); if(b) b.addEventListener('click', closeModal); },200);
        }
      } else if(hhmm !== settings.reminderTime && settings._lastFired){
        const s = getSettings(); delete s._lastFired; saveSettings(s);
      }
    }, 30*1000);
  }

  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/service-worker.js').then(()=> console.log('SW registered')).catch(e=>console.warn('SW failed',e));
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    wireIndex(); wireAdd(); wireList(); wireSettings();
    scheduleNotifications();
  });

})();