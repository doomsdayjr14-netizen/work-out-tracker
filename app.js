const STORAGE_KEY = 'form-workout-state-v1';

const workoutTemplates = {
  'Upper body push': ['Bench press','Incline dumbbell press','Seated shoulder press','Cable fly','Triceps pushdown'],
  'Upper body pull': ['Barbell row','Lat pulldown','Seated cable row','Face pull','Biceps curl'],
  'Leg strength': ['Back squat','Romanian deadlift','Leg press','Walking lunge','Calf raise'],
  'Core & conditioning': ['Goblet squat','Push-up','Dead bug','Mountain climber','Plank']
};

const mealPlans = {
  'Upper body push': [ ['Greek yogurt bowl','32g protein · 420 kcal'], ['Chicken & rice','44g protein · 560 kcal'], ['Banana + whey','28g protein · 260 kcal'] ],
  'Upper body pull': [ ['Egg & avocado toast','27g protein · 480 kcal'], ['Salmon quinoa bowl','38g protein · 610 kcal'], ['Cottage cheese','24g protein · 230 kcal'] ],
  'Leg strength': [ ['Oats + whey','35g protein · 510 kcal'], ['Lean beef pasta','48g protein · 690 kcal'], ['Chocolate milk','22g protein · 300 kcal'] ],
  'Core & conditioning': [ ['Egg-white omelet','30g protein · 390 kcal'], ['Turkey sweet potato','42g protein · 570 kcal'], ['Greek yogurt','20g protein · 180 kcal'] ]
};

const defaultState = { workouts:[], meals:[], activeWorkout:null, previousBaseline:{} };
let state = loadState();
let timerId = null;
let elapsed = 0;

function loadState(){ try { return {...defaultState, ...JSON.parse(localStorage.getItem(STORAGE_KEY))}; } catch { return structuredClone(defaultState); } }
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function todayKey(){ return new Date().toLocaleDateString('en-CA'); }
function formatTime(seconds){ const m=Math.floor(seconds/60).toString().padStart(2,'0'); const s=(seconds%60).toString().padStart(2,'0'); return `${m}:${s}`; }
function showToast(message){ const toast=document.getElementById('toast'); toast.textContent=message; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),3200); }

function switchView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===name));
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  const titles={dashboard:'Good morning, Jamie',workout:'Workout session',nutrition:'Fuel your progress',history:'Training history'};
  document.getElementById('pageTitle').textContent=titles[name];
  if(name==='nutrition') renderNutrition();
  if(name==='history') renderHistory();
}

document.querySelectorAll('.nav-item').forEach(button=>button.addEventListener('click',()=>switchView(button.dataset.view)));

document.getElementById('quickStart').addEventListener('click',()=>startWorkout('Upper body push'));
document.querySelectorAll('.start-program').forEach(button=>button.addEventListener('click',()=>startWorkout(button.dataset.workout)));
document.getElementById('viewMeal').addEventListener('click',()=>switchView('nutrition'));

function startWorkout(name){
  elapsed=0; clearInterval(timerId);
  state.activeWorkout={name,date:todayKey(),startedAt:Date.now(),exercises:workoutTemplates[name].map(exercise=>({exercise,weight:'',reps:''}))};
  saveState(); switchView('workout'); renderWorkout();
  timerId=setInterval(()=>{ elapsed++; document.getElementById('sessionTimer').textContent=formatTime(elapsed); },1000);
  document.getElementById('workoutStatus').textContent='In progress';
  showToast(`${name} started`);
}

function renderWorkout(){
  const active=state.activeWorkout;
  document.getElementById('activeWorkoutTitle').textContent=active?.name || 'Choose a workout';
  const list=document.getElementById('exerciseList');
  if(!active){ list.innerHTML='<article class="stat-card"><h3>No active session</h3><p>Select a workout from the overview to begin.</p></article>'; return; }
  list.innerHTML=active.exercises.map((item,index)=>`<article class="exercise-row"><div><small>EXERCISE ${index+1}</small><h3>${item.exercise}</h3></div><label>Weight (kg)<input type="number" min="0" step="1" data-index="${index}" data-field="weight" value="${item.weight}"></label><label>Reps<input type="number" min="1" data-index="${index}" data-field="reps" value="${item.reps}"></label><button class="log-set" data-index="${index}" title="Log set">✓</button></article>`).join('');
  list.querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{ const item=active.exercises[Number(input.dataset.index)]; item[input.dataset.field]=input.value; saveState(); }));
  list.querySelectorAll('.log-set').forEach(button=>button.addEventListener('click',()=>logSet(Number(button.dataset.index))));
}

function logSet(index){
  const item=state.activeWorkout.exercises[index];
  const weight=Number(item.weight), reps=Number(item.reps);
  if(!weight || !reps){ showToast('Enter weight and reps first'); return; }
  const key=item.exercise; const previous=state.previousBaseline[key];
  const volume=weight*reps;
  if(!previous){ state.previousBaseline[key]={weight,reps,volume}; }
  else if(weight > previous.weight || reps > previous.reps){
    const percent=Math.round(((weight*reps)/previous.volume-1)*100);
    if(percent>=5){ announceProgress(item.exercise,weight,reps,percent); }
  }
  state.previousBaseline[key]={weight,reps,volume};
  updateSessionMetrics(); saveState();
}

async function announceProgress(exercise,weight,reps,percent){
  const message=`Significant progress: ${exercise} — ${weight} kg × ${reps} reps (${percent}% above baseline).`;
  const feed=document.getElementById('progressFeed');
  feed.insertAdjacentHTML('afterbegin',`<p><strong>New personal gain</strong><br>${exercise}: ${weight} kg × ${reps}</p>`);
  showToast(message);
  if(Notification.permission==='granted') new Notification('Workout progress!',{body:message,icon:'./icon.svg'});
}

function updateSessionMetrics(){
  if(!state.activeWorkout) return;
  let volume=0,sets=0;
  state.activeWorkout.exercises.forEach(item=>{ if(item.weight&&item.reps){volume+=Number(item.weight)*Number(item.reps);sets++;} });
  document.getElementById('sessionVolume').textContent=`${volume} kg`; document.getElementById('sessionSets').textContent=sets;
}

document.getElementById('finishWorkout').addEventListener('click',()=>{
  if(!state.activeWorkout){ showToast('Start a workout first'); return; }
  let volume=0,sets=0;
  state.activeWorkout.exercises.forEach(item=>{ if(item.weight&&item.reps){volume+=Number(item.weight)*Number(item.reps);sets++;} });
  state.workouts.push({...state.activeWorkout,volume,sets,duration:elapsed,finishedAt:Date.now()});
  state.activeWorkout=null; clearInterval(timerId); elapsed=0; saveState(); renderWorkout();
  document.getElementById('sessionTimer').textContent='00:00'; document.getElementById('workoutStatus').textContent='Ready';
  showToast('Workout saved'); updateDashboard(); renderHistory();
});

document.getElementById('notificationButton').addEventListener('click',async()=>{
  if(!('Notification' in window)){ showToast('Notifications are not supported in this browser'); return; }
  const permission=await Notification.requestPermission();
  showToast(permission==='granted'?'Progress notifications enabled':'Notifications remain disabled');
});

function renderNutrition(){
  const today=todayKey();
  const meals=state.meals.filter(meal=>meal.date===today);
  const totals=meals.reduce((a,m)=>({calories:a.calories+m.calories,protein:a.protein+m.protein,carbs:a.carbs+m.carbs,fat:a.fat+m.fat}),{calories:0,protein:0,carbs:0,fat:0});
  document.getElementById('macroCalories').textContent=totals.calories;
  document.getElementById('proteinTotal').textContent=`${totals.protein}g`;
  document.getElementById('carbsTotal').textContent=`${totals.carbs}g`;
  document.getElementById('fatTotal').textContent=`${totals.fat}g`;
  const percent=Math.min(totals.calories/2200*100,100);
  document.getElementById('macroRing').style.background=`conic-gradient(#b4c66d ${percent}%,#edf0e7 ${percent}%)`;

  const workout=state.activeWorkout?.name || state.workouts.at(-1)?.name || 'Upper body push';
  document.getElementById('planTitle').textContent=workout;
  document.getElementById('mealPlan').innerHTML=mealPlans[workout].map(([name,detail])=>`<div class="meal-item"><div><strong>${name}</strong><small>${detail}</small></div><button class="round-button quick-log" data-name="${name}">+</button></div>`).join('') + (meals.length?`<div class="eyebrow" style="margin-top:16px">LOGGED TODAY</div>`+meals.map(m=>`<div class="meal-item"><div><strong>${m.name}</strong><small>${m.calories} kcal · ${m.protein}g protein</small></div></div>`).join(''):'');
}

function openMealModal(){ document.getElementById('mealModal').classList.add('open'); }
document.getElementById('addMealButton').addEventListener('click',openMealModal);
document.querySelector('[data-close]').addEventListener('click',()=>document.getElementById('mealModal').classList.remove('open'));
document.getElementById('mealModal').addEventListener('click',event=>{ if(event.target.id==='mealModal') event.target.classList.remove('open'); });
document.getElementById('mealForm').addEventListener('submit',event=>{ event.preventEvent?.(); event.preventDefault(); const data=new FormData(event.currentTarget); state.meals.push({name:data.get('name'),calories:Number(data.get('calories')),protein:Number(data.get('protein')),carbs:Number(data.get('carbs')),fat:Number(data.get('fat')),date:todayKey()}); saveState(); event.currentTarget.reset(); document.getElementById('mealModal').classList.remove('open'); renderNutrition(); updateDashboard(); showToast('Meal added'); });

function renderHistory(){
  const list=document.getElementById('historyList');
  if(!state.workouts.length){ list.innerHTML='<article class="history-card"><h3>No sessions yet</h3><p>Your completed workouts will appear here.</p></article>'; return; }
  list.innerHTML=[...state.workouts].reverse().map(w=>`<article class="history-card"><h3>${w.name}</h3><p>${new Date(w.finishedAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})} · ${formatTime(w.duration||0)}</p><p><strong>${w.volume||0} kg</strong> volume · ${w.sets||0} logged sets</p></article>`).join('');
}

function updateDashboard(){
  const today=todayKey();
  const todays=state.workouts.filter(w=>w.date===today);
  const volume=todays.reduce((sum,w)=>sum+(w.volume||0),0);
  document.getElementById('volumeStat').textContent=volume?`${volume} kg`:'—';
  document.getElementById('volumeTrend').textContent=todays.length?`${todays.length} session${todays.length>1?'s':''} today`:'No workout logged yet';
  const calories=state.meals.filter(m=>m.date===today).reduce((sum,m)=>sum+m.calories,0);
  document.getElementById('calorieStat').innerHTML=`${calories} <em>/ 2,200 kcal</em>`;
  document.getElementById('calorieBar').style.width=`${Math.min(calories/2200*100,100)}%`;
  const unique=[...new Set(state.workouts.map(w=>w.date))]; document.getElementById('streakStat').innerHTML=`${unique.length} <em>days</em>`;
}

const dateFormatter=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric'});
document.getElementById('todayLabel').textContent=dateFormatter.format(new Date()).toUpperCase();
renderWorkout(); renderNutrition(); renderHistory(); updateDashboard();

if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{})); }
