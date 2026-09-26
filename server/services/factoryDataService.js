/* ==========================================================================
   factoryDataService.js
   Provides deterministic, pre-calculated factory intelligence functions.
   The AI receives these results as structured context — no raw guessing.
   ========================================================================== */

'use strict';

// ---------------------------------------------------------------------------
//  Static mock data (mirrors js/utils.js seed data so AI sees the same values)
// ---------------------------------------------------------------------------

const WORKER_USERS = [
  { id: 'WRK-102', name: 'Priya Kumar',  email: 'worker@agms.com',  skills: ['Stitching', 'Quality Check'], primaryStage: 'Stitching', ratePerPiece: 15, phone: '9876543210', joined: '2024-03-05', department: 'Stitching' },
  { id: 'WRK-103', name: 'Ravi Kumar',   email: 'ravi@agms.com',    skills: ['Stitching'],                  primaryStage: 'Stitching', ratePerPiece: 15, phone: '9876501111', joined: '2024-02-10', department: 'Stitching' },
  { id: 'WRK-104', name: 'Sunita Devi',  email: 'sunita@agms.com',  skills: ['Packing'],                    primaryStage: 'Packing',   ratePerPiece: 12, phone: '9988776655', joined: '2024-04-12', department: 'Packing'  }
];

const WORKER_TASKS = [
  { workerId: 'WRK-102', orderId: 'ORD-1042', product: "Men's Cotton Shirt", stage: 'Stitching', target: 150, completed: 112, deadline: 'Today, 6:00 PM',  priority: 'High',   status: 'On Track'    },
  { workerId: 'WRK-102', orderId: 'ORD-1038', product: 'Denim Jacket',       stage: 'Stitching', target: 80,  completed: 0,   deadline: 'Tomorrow, 5 PM', priority: 'Medium', status: 'Not Started' },
  { workerId: 'WRK-103', orderId: 'ORD-1041', product: 'Kids T-Shirt',       stage: 'Stitching', target: 200, completed: 180, deadline: 'Today, 4:00 PM', priority: 'High',   status: 'Almost Done' },
  { workerId: 'WRK-104', orderId: 'ORD-1040', product: 'Linen Trousers',     stage: 'Packing',   target: 100, completed: 65,  deadline: 'Today, 7:00 PM', priority: 'Medium', status: 'On Track'    }
];

// Static orders seeded in the system (consistent with worker tasks and UI)
const STATIC_ORDERS = [
  { id: 'ORD-1042', product: "Men's Cotton Shirt",  quantity: 150, status: 'In Progress', daysOffset:  0,  value: 112500, materialCost: 42000, workerCost: 18000, otherCost: 4500, delayReason: "Stitching bottleneck: Assigned worker Priya Kumar (WRK-102) is overloaded with multiple concurrent orders. Currently 112 of 150 pieces completed with deadline Today at 6:00 PM." },
  { id: 'ORD-1038', product: 'Denim Jacket - Black', quantity: 80,  status: 'In Progress', daysOffset:  1,  value: 96000,  materialCost: 35000, workerCost: 14000, otherCost: 4000, delayReason: "Stitching stage not started (0/80 completed) because worker is prioritizing ORD-1042." },
  { id: 'ORD-1041', product: 'Kids T-Shirt - Yellow',quantity: 200, status: 'In Progress', daysOffset:  0,  value: 90000,  materialCost: 30000, workerCost: 16000, otherCost: 3000, delayReason: "Near completion (180/200 pieces done); scheduled for final QC by 4:00 PM." },
  { id: 'ORD-1040', product: 'Linen Trousers - Beige', quantity: 100, status: 'In Progress', daysOffset:  0,  value: 75000,  materialCost: 28000, workerCost: 10000, otherCost: 3000, delayReason: "Packing stage in progress (65/100 pieces done by Sunita Devi)." },
  { id: 'ORD-1035', product: 'Cotton Kurta - Blue',  quantity: 250, status: 'Completed',   daysOffset: -5,  value: 125000, materialCost: 45000, workerCost: 18000, otherCost: 5000, delayReason: "None (Completed and dispatched)." },
  { id: 'ORD-1036', product: 'Silk Saree - Maroon',  quantity: 80,  status: 'In Progress', daysOffset:  6,  value: 120000, materialCost: 70000, workerCost: 12000, otherCost: 3000, delayReason: "Fabric procurement delay resolved; currently on schedule." },
  { id: 'ORD-1037', product: 'Formal Shirt - White', quantity: 400, status: 'Pending',     daysOffset:  10, value: 160000, materialCost: 60000, workerCost: 25000, otherCost: 6000, delayReason: "Awaiting cutting batch allocation." }
];

const PRODUCTION_STAGES = [
  { stage: 'Cutting',       target: 1800, completed: 1620, department: 'Cutting'        },
  { stage: 'Stitching',     target: 1500, completed: 1080, department: 'Stitching'      },
  { stage: 'Quality Check', target: 1200, completed: 1050, department: 'Quality Check'  },
  { stage: 'Packing',       target: 900,  completed: 750,  department: 'Packing'        }
];

const PAYMENTS_DATA = [
  { workerName: 'Ravi Kumar',   amount: 18000, status: 'Paid',    date: '2026-09-20' },
  { workerName: 'Priya Sharma', amount: 16500, status: 'Pending', date: '2026-09-22' },
  { workerName: 'Anil Verma',   amount: 15000, status: 'Paid',    date: '2026-09-18' },
  { workerName: 'Sunita Devi',  amount: 13500, status: 'Pending', date: '2026-09-24' }
];

// ---------------------------------------------------------------------------
//  Helper utilities
// ---------------------------------------------------------------------------

function pct(completed, target) {
  if (!target || target === 0) return 0;
  return Math.round((completed / target) * 100);
}

function daysTill(offsetDays) {
  return offsetDays;  // positive = future, negative = past
}

function riskLevel(order) {
  const days = daysTill(order.daysOffset);
  const progress = order.status === 'Completed' ? 100 : (order.status === 'Pending' ? 0 : 50);
  if (order.status === 'Completed') return 'none';
  if (days < 0) return 'critical';   // already past deadline
  if (days <= 2 && progress < 80) return 'high';
  if (days <= 5 && progress < 60) return 'medium';
  if (days <= 3) return 'medium';
  return 'low';
}

// ---------------------------------------------------------------------------
//  Public intelligence functions
// ---------------------------------------------------------------------------

function getOrdersAtRisk() {
  return STATIC_ORDERS
    .filter(o => ['high', 'critical', 'medium'].includes(riskLevel(o)))
    .map(o => ({
      ...o,
      risk: riskLevel(o),
      daysUntilDeadline: o.daysOffset,
      deadlineLabel: o.daysOffset < 0 ? `${Math.abs(o.daysOffset)} day(s) overdue` :
                     o.daysOffset === 0 ? 'Due today' :
                     `${o.daysOffset} day(s) remaining`
    }));
}

function getProductionSummary() {
  const allOrders = STATIC_ORDERS;
  const activeOrders = allOrders.filter(o => o.status === 'In Progress');
  const completedOrders = allOrders.filter(o => o.status === 'Completed');
  const pendingOrders = allOrders.filter(o => o.status === 'Pending');

  const totalTarget = PRODUCTION_STAGES.reduce((s, p) => s + p.target, 0);
  const totalCompleted = PRODUCTION_STAGES.reduce((s, p) => s + p.completed, 0);
  const totalRemaining = totalTarget - totalCompleted;
  const overallPct = pct(totalCompleted, totalTarget);

  const bottleneck = [...PRODUCTION_STAGES].sort((a, b) => {
    const aRemain = a.target - a.completed;
    const bRemain = b.target - b.completed;
    return bRemain - aRemain;  // highest remaining = worst bottleneck
  })[0];

  return {
    totalOrders: allOrders.length,
    activeOrders: activeOrders.length,
    completedOrders: completedOrders.length,
    pendingOrders: pendingOrders.length,
    atRiskOrders: getOrdersAtRisk().length,
    production: {
      totalTarget,
      totalCompleted,
      totalRemaining,
      overallCompletionPercent: overallPct,
      stages: PRODUCTION_STAGES.map(p => ({
        stage: p.stage,
        target: p.target,
        completed: p.completed,
        remaining: p.target - p.completed,
        completionPercent: pct(p.completed, p.target)
      }))
    },
    bottleneck: {
      stage: bottleneck.stage,
      target: bottleneck.target,
      completed: bottleneck.completed,
      remaining: bottleneck.target - bottleneck.completed,
      completionPercent: pct(bottleneck.completed, bottleneck.target)
    }
  };
}

function getWorkerWorkload() {
  return WORKER_USERS.map(worker => {
    const tasks = WORKER_TASKS.filter(t => t.workerId === worker.id);
    const totalTarget = tasks.reduce((s, t) => s + t.target, 0);
    const totalCompleted = tasks.reduce((s, t) => s + t.completed, 0);
    const totalRemaining = totalTarget - totalCompleted;
    const completionPct = pct(totalCompleted, totalTarget);
    const todayTasks = tasks.filter(t => t.deadline.toLowerCase().includes('today'));
    const overloaded = todayTasks.length > 1 || (todayTasks.length === 1 && completionPct < 60);

    return {
      id: worker.id,
      name: worker.name,
      department: worker.department,
      primaryStage: worker.primaryStage,
      skills: worker.skills,
      ratePerPiece: worker.ratePerPiece,
      totalAssignedTasks: tasks.length,
      todayTaskCount: todayTasks.length,
      totalTarget,
      totalCompleted,
      totalRemaining,
      completionPercent: completionPct,
      estimatedEarningsToday: totalCompleted * worker.ratePerPiece,
      overloaded,
      tasks: tasks.map(t => ({
        orderId: t.orderId,
        product: t.product,
        stage: t.stage,
        target: t.target,
        completed: t.completed,
        remaining: t.target - t.completed,
        completionPercent: pct(t.completed, t.target),
        deadline: t.deadline,
        priority: t.priority,
        status: t.status
      }))
    };
  });
}

function getAvailableWorkers() {
  return getWorkerWorkload().filter(w => !w.overloaded);
}

function getBottlenecks() {
  return PRODUCTION_STAGES
    .map(p => ({
      stage: p.stage,
      target: p.target,
      completed: p.completed,
      remaining: p.target - p.completed,
      completionPercent: pct(p.completed, p.target),
      severity: (p.target - p.completed) > 400 ? 'high' :
                (p.target - p.completed) > 200 ? 'medium' : 'low'
    }))
    .sort((a, b) => b.remaining - a.remaining);
}

function getPendingPayments() {
  const pending = PAYMENTS_DATA.filter(p => p.status === 'Pending');
  const paid = PAYMENTS_DATA.filter(p => p.status === 'Paid');
  const totalPending = pending.reduce((s, p) => s + p.amount, 0);
  const totalPaid = paid.reduce((s, p) => s + p.amount, 0);

  return {
    totalPendingAmount: totalPending,
    totalPaidAmount: totalPaid,
    pendingCount: pending.length,
    pendingPayments: pending,
    paidPayments: paid,
    allPayments: PAYMENTS_DATA
  };
}

function getProfitSummary() {
  const orders = STATIC_ORDERS.map(o => {
    const totalCost = o.materialCost + o.workerCost + o.otherCost;
    const profit = o.value - totalCost;
    const profitMargin = Math.round((profit / o.value) * 100);
    return {
      id: o.id,
      product: o.product,
      status: o.status,
      orderValue: o.value,
      materialCost: o.materialCost,
      workerCost: o.workerCost,
      otherCost: o.otherCost,
      totalCost,
      estimatedProfit: profit,
      profitMarginPercent: profitMargin
    };
  });

  const totalValue = orders.reduce((s, o) => s + o.orderValue, 0);
  const totalCost = orders.reduce((s, o) => s + o.totalCost, 0);
  const totalProfit = orders.reduce((s, o) => s + o.estimatedProfit, 0);
  const overallMargin = Math.round((totalProfit / totalValue) * 100);

  const mostProfitable = [...orders].sort((a, b) => b.estimatedProfit - a.estimatedProfit)[0];

  return {
    totalOrderValue: totalValue,
    totalCost,
    totalEstimatedProfit: totalProfit,
    overallProfitMarginPercent: overallMargin,
    mostProfitableOrder: mostProfitable,
    orders
  };
}

function getTodayProduction() {
  const todayTasks = WORKER_TASKS.filter(t => t.deadline.toLowerCase().includes('today'));
  const totalTarget = todayTasks.reduce((s, t) => s + t.target, 0);
  const totalCompleted = todayTasks.reduce((s, t) => s + t.completed, 0);
  return {
    todayOrders: todayTasks.length,
    totalTarget,
    totalCompleted,
    totalRemaining: totalTarget - totalCompleted,
    completionPercent: pct(totalCompleted, totalTarget),
    tasks: todayTasks.map(t => {
      const worker = WORKER_USERS.find(w => w.id === t.workerId);
      return {
        ...t,
        workerName: worker ? worker.name : 'Unknown',
        remaining: t.target - t.completed,
        completionPercent: pct(t.completed, t.target)
      };
    })
  };
}

function getWorkerPerformance() {
  return getWorkerWorkload().map(w => ({
    name: w.name,
    department: w.department,
    completionPercent: w.completionPercent,
    totalCompleted: w.totalCompleted,
    estimatedEarnings: w.estimatedEarningsToday,
    overloaded: w.overloaded,
    tasks: w.tasks
  })).sort((a, b) => b.totalCompleted - a.totalCompleted);
}

function getOrderDetails(orderId) {
  const order = STATIC_ORDERS.find(o => o.id === orderId || o.product.toLowerCase().includes(orderId.toLowerCase()));
  if (!order) return null;
  const totalCost = order.materialCost + order.workerCost + order.otherCost;
  return {
    ...order,
    totalCost,
    profit: order.value - totalCost,
    profitMargin: Math.round(((order.value - totalCost) / order.value) * 100),
    risk: riskLevel(order),
    deadlineLabel: order.daysOffset < 0 ? `${Math.abs(order.daysOffset)} days overdue` :
                   order.daysOffset === 0 ? 'Due today' : `${order.daysOffset} days remaining`
  };
}

// ---------------------------------------------------------------------------
//  Context selector — sends only relevant data per question category
// ---------------------------------------------------------------------------

function selectContext(message, conversation = []) {
  const msg = message.toLowerCase();

  // Check if referencing a previous turn (e.g. "Why?")
  const lastTurn = Array.isArray(conversation) && conversation.length > 0 ? conversation[conversation.length - 1] : null;
  const lastUserMsg = Array.isArray(conversation) && conversation.length > 1 ? conversation[conversation.length - 2] : null;
  const isFollowUpWhy = /^(why\??|why so\??|why is that\??|how come\??|reason\??)$/i.test(msg.trim());

  // Determine which intelligence functions to call
  const isWorker    = /worker|staff|assign|workload|overload|capacity|team/i.test(msg) || (isFollowUpWhy && lastUserMsg && /worker|overload/i.test(lastUserMsg.content));
  const isPayment   = /pay|payment|salary|pending|paid|money owed|balance/i.test(msg);
  const isProfit    = /profit|margin|cost|revenue|earning|income|loss/i.test(msg);
  const isDelay     = /delay|late|risk|at.?risk|deadline|overdue|behind/i.test(msg) || isFollowUpWhy;
  const isBottleneck= /bottleneck|slow|stuck|stage|block|issue/i.test(msg) || isFollowUpWhy;
  const isProduction= /production|pieces|target|completed|remaining|summary|today/i.test(msg);
  const isOrder     = /order|customer|deliver|product|quantity|1042|1038|1041|1040/i.test(msg) || isFollowUpWhy;
  const isPriority  = /priorit|urgent|first|focus|important/i.test(msg);
  const isGeneral   = !isWorker && !isPayment && !isProfit && !isDelay && !isBottleneck && !isProduction && !isOrder && !isPriority;

  const ctx = {};

  // Check for specific order ID mentioned (e.g. 1042)
  const orderIdMatch = msg.match(/1042|1038|1041|1040|1035|1036|1037/i);
  if (orderIdMatch) {
    const matchedOrder = STATIC_ORDERS.find(o => o.id.includes(orderIdMatch[0]));
    if (matchedOrder) {
      ctx.specificOrder = getOrderDetails(matchedOrder.id);
      ctx.assignedTasks = WORKER_TASKS.filter(t => t.orderId.includes(orderIdMatch[0]));
    }
  } else if (isFollowUpWhy) {
    // If follow-up "Why?", provide context for high-risk orders like ORD-1042
    ctx.specificOrder = getOrderDetails('ORD-1042');
    ctx.assignedTasks = WORKER_TASKS.filter(t => t.orderId === 'ORD-1042');
  }

  if (isOrder || isDelay || isPriority || isGeneral) {
    ctx.ordersAtRisk = getOrdersAtRisk();
    ctx.productionSummary = getProductionSummary();
  }
  if (isWorker || isDelay || isPriority || isGeneral) {
    ctx.workerWorkload = getWorkerWorkload();
    ctx.availableWorkers = getAvailableWorkers();
  }
  if (isPayment || isGeneral) {
    ctx.payments = getPendingPayments();
  }
  if (isProfit || isGeneral) {
    ctx.profit = getProfitSummary();
  }
  if (isBottleneck || isProduction || isGeneral) {
    ctx.bottlenecks = getBottlenecks();
    ctx.todayProduction = getTodayProduction();
  }
  if (isProduction || isGeneral) {
    ctx.productionSummary = ctx.productionSummary || getProductionSummary();
  }
  if (isPriority) {
    ctx.workerPerformance = getWorkerPerformance();
  }

  return ctx;
}

// ---------------------------------------------------------------------------
//  Demo / fallback responder (no OpenAI key required)
// ---------------------------------------------------------------------------

function buildDemoResponse(message, conversation = []) {
  const msg = message.toLowerCase().trim();

  // 1. Follow-up "Why?" question handling
  const isWhy = /^(why\??|why so\??|why is that\??|how come\??|reason\??)$/i.test(msg);
  if (isWhy) {
    return `⚠️ **Why Order #1042 (Men's Cotton Shirt) is Delayed:**\n\n` +
      `1. **Stitching Bottleneck:** The Stitching department is the factory's primary bottleneck today (1,080 / 1,500 target completed, 420 pieces remaining; 72% complete).\n` +
      `2. **Worker Overload:** Assigned worker **Priya Kumar (WRK-102)** has 2 major orders scheduled (ORD-1042 and ORD-1038) and is currently at 75% completion for today's quota.\n` +
      `3. **Tight Deadline:** Delivery is scheduled for **Today at 6:00 PM** with 38 pieces still needing stitching and subsequent QA/packing.\n\n` +
      `**Recommended Action:** Pair available worker **Ravi Kumar** (who has finished 90% of his daily quota) to assist Priya on Stitching to clear the remaining 38 pieces before 5:00 PM.`;
  }

  // 2. Specific question: "Why is Order #1042 delayed?"
  if (/1042/i.test(msg) && (/delay|why|risk|behind|late|status/i.test(msg) || /why is order/i.test(msg))) {
    const o = STATIC_ORDERS.find(ord => ord.id === 'ORD-1042');
    const task = WORKER_TASKS.find(t => t.orderId === 'ORD-1042');
    const worker = WORKER_USERS.find(w => w.id === task.workerId);
    return `⚠️ **Order #1042 Delay Analysis: ${o.product}**\n\n` +
      `• **Status:** ${o.status} (${task.completed}/${task.target} pieces completed, ${task.target - task.completed} remaining)\n` +
      `• **Deadline:** ${task.deadline} (High Priority)\n` +
      `• **Primary Cause:** **Stitching Bottleneck**. The Stitching stage is operating at 72% capacity with 420 pieces backlog across the factory.\n` +
      `• **Workload Issue:** Assigned worker **${worker.name}** (${worker.department}) is overloaded with 2 concurrent orders today.\n\n` +
      `**Recommended Mitigation:**\n` +
      `• Reassign 38 remaining pieces of stitching to **Ravi Kumar** (Stitching, WRK-103).\n` +
      `• Fast-track completed batches directly to Quality Check to ensure delivery by 6:00 PM.`;
  }

  // 3. Orders at risk
  if (/risk|at.?risk|which.*order/i.test(msg)) {
    const atRisk = getOrdersAtRisk();
    if (atRisk.length === 0) return '✅ Great news — no orders are currently at risk! All active orders are on track.';
    let resp = `⚠️ **${atRisk.length} order(s) currently at risk:**\n\n`;
    atRisk.forEach(o => {
      resp += `**${o.id}: ${o.product}**\n`;
      resp += `• Risk level: **${o.risk.toUpperCase()}**\n`;
      resp += `• Deadline: ${o.deadlineLabel}\n`;
      resp += `• Quantity: ${o.quantity} pieces (${o.status})\n`;
      resp += `• Reason: ${o.delayReason || 'Tight schedule in production pipeline.'}\n\n`;
    });
    resp += `**Recommended action:** Prioritize **Order #1042** immediately by expediting the Stitching stage.`;
    return resp;
  }

  // 4. Production summary
  if (/production summary|summary|today.*production|how.*production/i.test(msg)) {
    const s = getProductionSummary();
    return `📊 **Today's Production Summary**\n\n` +
      `• **Total Orders:** ${s.totalOrders} (${s.activeOrders} active, ${s.completedOrders} completed, ${s.pendingOrders} pending)\n` +
      `• **At-Risk Orders:** ${s.atRiskOrders} (Critical: ORD-1042)\n` +
      `• **Overall Completion:** **${s.production.overallCompletionPercent}%**\n` +
      `• **Target Pieces:** ${s.production.totalTarget.toLocaleString()}\n` +
      `• **Completed Pieces:** ${s.production.totalCompleted.toLocaleString()}\n` +
      `• **Remaining:** ${s.production.totalRemaining.toLocaleString()} pieces\n` +
      `• **Main Bottleneck:** **${s.bottleneck.stage}** (${s.bottleneck.remaining} pieces remaining, ${s.bottleneck.completionPercent}% done)\n\n` +
      `**Department Breakdown:**\n` +
      s.production.stages.map(st => `• ${st.stage}: ${st.completed}/${st.target} pieces (${st.completionPercent}%)`).join('\n');
  }

  // 5. Bottleneck question
  if (/bottleneck|slow|stuck|stage/i.test(msg)) {
    const bottlenecks = getBottlenecks();
    const top = bottlenecks[0];
    let resp = `🔴 **Current Production Bottleneck: ${top.stage}**\n\n`;
    resp += `• **Target:** ${top.target} pieces\n`;
    resp += `• **Completed:** ${top.completed} pieces\n`;
    resp += `• **Remaining Backlog:** **${top.remaining} pieces** (${top.completionPercent}% done)\n`;
    resp += `• **Impact:** Slowing down downstream Quality Check and Packing for Order #1042 and #1038.\n\n`;
    resp += `**All Production Stages:**\n`;
    bottlenecks.forEach(b => {
      const icon = b.severity === 'high' ? '🔴' : b.severity === 'medium' ? '🟡' : '🟢';
      resp += `${icon} **${b.stage}:** ${b.completed}/${b.target} pieces (${b.completionPercent}% done, ${b.remaining} left)\n`;
    });
    resp += `\n**Recommendation:** Temporarily assign cross-trained workers to Stitching to clear the 420-piece backlog.`;
    return resp;
  }

  // 6. Overloaded workers
  if (/overload|who.*busy|workload|worker.*load/i.test(msg)) {
    const workload = getWorkerWorkload();
    const overloaded = workload.filter(w => w.overloaded);
    if (overloaded.length === 0) return '✅ No workers appear overloaded right now. The team workload looks manageable.';
    let resp = `⚠️ **${overloaded.length} overloaded worker(s) detected:**\n\n`;
    overloaded.forEach(w => {
      resp += `**${w.name}** (${w.department} — ${w.id})\n`;
      resp += `• Assigned Tasks Today: **${w.todayTaskCount}**\n`;
      resp += `• Target Quota: ${w.totalTarget} pieces | Completed: ${w.totalCompleted} pieces (${w.completionPercent}%)\n`;
      resp += `• Remaining Work: **${w.totalRemaining} pieces**\n`;
      resp += `• Active Orders: ${w.tasks.map(t => `${t.orderId} (${t.product})`).join(', ')}\n\n`;
    });
    resp += `**Recommendation:** Shift Order #1038 or remaining 38 pieces of #1042 to Ravi Kumar (Stitching) who has spare capacity today.`;
    return resp;
  }

  // 7. Pending payments
  if (/pay|payment|pending.*pay|salary/i.test(msg)) {
    const pay = getPendingPayments();
    let resp = `💳 **Factory Payment Status**\n\n`;
    resp += `• **Total Pending:** ₹${pay.totalPendingAmount.toLocaleString('en-IN')} (${pay.pendingCount} workers)\n`;
    resp += `• **Total Paid:** ₹${pay.totalPaidAmount.toLocaleString('en-IN')}\n\n`;
    resp += `**Pending Payment List:**\n`;
    pay.pendingPayments.forEach(p => {
      resp += `• **${p.workerName}:** ₹${p.amount.toLocaleString('en-IN')} (Due date: ${p.date})\n`;
    });
    resp += `\n**Paid Records:**\n`;
    pay.paidPayments.forEach(p => {
      resp += `• ${p.workerName}: ₹${p.amount.toLocaleString('en-IN')} (Paid on ${p.date})\n`;
    });
    return resp;
  }

  // 8. Profit summary
  if (/profit|margin|earning|cost|revenue/i.test(msg)) {
    const profit = getProfitSummary();
    return `💰 **Factory Profit & Margin Summary**\n\n` +
      `• **Total Order Revenue:** ₹${profit.totalOrderValue.toLocaleString('en-IN')}\n` +
      `• **Total Production Cost:** ₹${profit.totalCost.toLocaleString('en-IN')}\n` +
      `• **Total Estimated Profit:** **₹${profit.totalEstimatedProfit.toLocaleString('en-IN')}**\n` +
      `• **Overall Profit Margin:** **${profit.overallProfitMarginPercent}%**\n\n` +
      `**Most Profitable Order:**\n` +
      `• **${profit.mostProfitableOrder.product} (${profit.mostProfitableOrder.id}):** ₹${profit.mostProfitableOrder.estimatedProfit.toLocaleString('en-IN')} profit (${profit.mostProfitableOrder.profitMarginPercent}% margin)`;
  }

  // 9. Priority
  if (/priorit|urgent|focus|first/i.test(msg)) {
    const atRisk = getOrdersAtRisk();
    const bottleneck = getBottlenecks()[0];
    if (atRisk.length > 0) {
      const top = atRisk.sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline)[0];
      return `🎯 **Top Factory Priority: ${top.product} (${top.id})**\n\n` +
        `This order has the most critical deadline (${top.deadlineLabel}) and is currently at **${top.risk.toUpperCase()}** risk.\n\n` +
        `**Recommended Action:** Direct all available **${bottleneck.stage}** capacity to Order #${top.id.replace('ORD-', '')} to finish the remaining pieces before the delivery cutoff.`;
    }
    return `✅ No orders are currently at critical risk. Your main production focus should be **${bottleneck.stage}** which has ${bottleneck.remaining} pieces remaining.`;
  }

  // General fallback
  const summary = getProductionSummary();
  return `👋 **AI Garment Factory Overview**\n\n` +
    `• **Active Orders:** ${summary.activeOrders} of ${summary.totalOrders} total orders\n` +
    `• **Production Completion:** **${summary.production.overallCompletionPercent}%**\n` +
    `• **At-Risk Orders:** ${summary.atRiskOrders} (Order #1042 Men's Cotton Shirt)\n` +
    `• **Active Bottleneck:** **${summary.bottleneck.stage}** (${summary.bottleneck.remaining} pieces remaining)\n\n` +
    `You can ask me about: orders at risk, why order #1042 is delayed, production summary, worker workload, pending payments, profit margins, or bottlenecks.`;
}

module.exports = {
  getOrdersAtRisk,
  getProductionSummary,
  getWorkerWorkload,
  getAvailableWorkers,
  getBottlenecks,
  getPendingPayments,
  getProfitSummary,
  getTodayProduction,
  getWorkerPerformance,
  getOrderDetails,
  selectContext,
  buildDemoResponse
};
