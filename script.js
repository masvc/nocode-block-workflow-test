// ワークフロービルダー - メインスクリプト

// ブロック定義
const BLOCK_TYPES = {
    // アクションブロック
    start: {
        name: 'スタート',
        icon: '🚀',
        color: '#4CAF50',
        inputs: [],
        outputs: ['next'],
        category: 'action'
    },
    api_call: {
        name: 'API呼び出し',
        icon: '🌐',
        color: '#2196F3',
        inputs: ['trigger'],
        outputs: ['success', 'error'],
        properties: {
            url: { type: 'text', label: 'URL', default: 'https://api.example.com' },
            method: { type: 'select', label: 'メソッド', options: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
            headers: { type: 'textarea', label: 'ヘッダー', default: '{}' }
        },
        category: 'action'
    },
    send_email: {
        name: 'メール送信',
        icon: '📧',
        color: '#FF9800',
        inputs: ['trigger'],
        outputs: ['sent'],
        properties: {
            to: { type: 'text', label: '宛先', default: 'user@example.com' },
            subject: { type: 'text', label: '件名', default: 'ワークフロー通知' },
            body: { type: 'textarea', label: '本文', default: 'ワークフローが実行されました。' }
        },
        category: 'action'
    },
    database: {
        name: 'データベース',
        icon: '🗄️',
        color: '#9C27B0',
        inputs: ['query'],
        outputs: ['result'],
        properties: {
            connection: { type: 'text', label: '接続文字列', default: 'postgresql://localhost:5432/db' },
            query: { type: 'textarea', label: 'クエリ', default: 'SELECT * FROM users;' }
        },
        category: 'action'
    },

    // 制御ブロック
    condition: {
        name: '条件分岐',
        icon: '🔀',
        color: '#FF5722',
        inputs: ['input'],
        outputs: ['true', 'false'],
        properties: {
            condition: { type: 'text', label: '条件式', default: 'value > 100' }
        },
        category: 'control'
    },
    loop: {
        name: 'ループ',
        icon: '🔄',
        color: '#795548',
        inputs: ['start'],
        outputs: ['iteration', 'complete'],
        properties: {
            type: { type: 'select', label: 'ループ種別', options: ['for', 'while', 'foreach'], default: 'for' },
            count: { type: 'number', label: '回数', default: 10 }
        },
        category: 'control'
    },
    delay: {
        name: '待機',
        icon: '⏰',
        color: '#607D8B',
        inputs: ['trigger'],
        outputs: ['complete'],
        properties: {
            duration: { type: 'number', label: '待機時間(秒)', default: 5 }
        },
        category: 'control'
    },

    // データブロック
    data_transform: {
        name: 'データ変換',
        icon: '🔧',
        color: '#3F51B5',
        inputs: ['data'],
        outputs: ['transformed'],
        properties: {
            script: { type: 'textarea', label: '変換スクリプト', default: 'return data.map(x => x * 2);' }
        },
        category: 'data'
    },
    filter: {
        name: 'フィルター',
        icon: '🔍',
        color: '#009688',
        inputs: ['data'],
        outputs: ['filtered'],
        properties: {
            condition: { type: 'text', label: 'フィルター条件', default: 'item.status === "active"' }
        },
        category: 'data'
    },
    csv_reader: {
        name: 'CSV読込',
        icon: '📄',
        color: '#4CAF50',
        inputs: ['file'],
        outputs: ['data'],
        properties: {
            delimiter: { type: 'text', label: '区切り文字', default: ',' },
            encoding: { type: 'select', label: 'エンコーディング', options: ['UTF-8', 'Shift_JIS'], default: 'UTF-8' }
        },
        category: 'data'
    },

    // 統合ブロック
    slack: {
        name: 'Slack通知',
        icon: '💬',
        color: '#4A154B',
        inputs: ['trigger'],
        outputs: ['sent'],
        properties: {
            channel: { type: 'text', label: 'チャンネル', default: '#general' },
            message: { type: 'textarea', label: 'メッセージ', default: 'ワークフローが完了しました！' }
        },
        category: 'integration'
    },
    github: {
        name: 'GitHub',
        icon: '🐙',
        color: '#24292e',
        inputs: ['trigger'],
        outputs: ['success'],
        properties: {
            action: { type: 'select', label: 'アクション', options: ['create_issue', 'merge_pr', 'deploy'], default: 'create_issue' },
            repo: { type: 'text', label: 'リポジトリ', default: 'owner/repo' }
        },
        category: 'integration'
    },
    webhook: {
        name: 'Webhook',
        icon: '🪝',
        color: '#FFC107',
        inputs: ['data'],
        outputs: ['response'],
        properties: {
            url: { type: 'text', label: 'Webhook URL', default: 'https://hooks.example.com/webhook' },
            secret: { type: 'password', label: 'シークレット', default: '' }
        },
        category: 'integration'
    }
};

// グローバル変数
let canvasBlocks = [];
let connections = [];
let selectedBlock = null;
let draggedPaletteBlock = null;
let isConnecting = false;
let connectionStart = null;
let canvasZoom = 1;
let canvasOffset = { x: 0, y: 0 };
let nextBlockId = 1;
let executionOrder = [];

// ローカルストレージ（実際のデプロイ用）
let workflowStorage = {};

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    initializePalette();
    initializeCanvas();
    setupEventListeners();
    console.log('🧱 ワークフロービルダー initialized!');
});

function initializePalette() {
    const categories = {
        actionBlocks: 'action',
        controlBlocks: 'control', 
        dataBlocks: 'data',
        integrationBlocks: 'integration'
    };

    for (const [containerId, category] of Object.entries(categories)) {
        const container = document.getElementById(containerId);
        const blocks = Object.entries(BLOCK_TYPES).filter(([_, block]) => block.category === category);
        
        blocks.forEach(([type, block]) => {
            const blockEl = createPaletteBlock(type, block);
            container.appendChild(blockEl);
        });
    }
}

function createPaletteBlock(type, blockDef) {
    const block = document.createElement('div');
    block.className = 'palette-block';
    block.draggable = true;
    block.dataset.blockType = type;
    
    block.innerHTML = `
        <div class="block-icon" style="background-color: ${blockDef.color}">
            ${blockDef.icon}
        </div>
        <div class="block-label">${blockDef.name}</div>
    `;

    block.addEventListener('dragstart', handlePaletteDragStart);
    return block;
}

function handlePaletteDragStart(e) {
    draggedPaletteBlock = e.target.closest('.palette-block').dataset.blockType;
    e.dataTransfer.effectAllowed = 'copy';
}

function initializeCanvas() {
    const canvas = document.getElementById('canvas');
    
    canvas.addEventListener('dragover', handleCanvasDragOver);
    canvas.addEventListener('drop', handleCanvasDrop);
    canvas.addEventListener('click', handleCanvasClick);
}

function handleCanvasDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
}

function handleCanvasDrop(e) {
    e.preventDefault();
    
    if (draggedPaletteBlock) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / canvasZoom - canvasOffset.x;
        const y = (e.clientY - rect.top) / canvasZoom - canvasOffset.y;
        
        createCanvasBlock(draggedPaletteBlock, x, y);
        draggedPaletteBlock = null;
    }
}

function createCanvasBlock(type, x, y) {
    const blockDef = BLOCK_TYPES[type];
    const blockId = `block_${nextBlockId++}`;
    
    const block = {
        id: blockId,
        type: type,
        x: x,
        y: y,
        properties: {}
    };

    // デフォルトプロパティを設定
    if (blockDef.properties) {
        for (const [key, prop] of Object.entries(blockDef.properties)) {
            block.properties[key] = prop.default;
        }
    }

    canvasBlocks.push(block);
    renderCanvasBlock(block);
    updateStats();
    calculateExecutionOrder();
    
    // ようこそメッセージを非表示
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.style.display = 'none';
    }
}

function renderCanvasBlock(block) {
    const blockDef = BLOCK_TYPES[block.type];
    const canvas = document.getElementById('canvas');
    
    const blockEl = document.createElement('div');
    blockEl.className = 'canvas-block';
    blockEl.dataset.blockId = block.id;
    blockEl.style.left = `${block.x}px`;
    blockEl.style.top = `${block.y}px`;

    const order = executionOrder.indexOf(block.id) + 1;
    const orderDisplay = order > 0 ? order : '';

    blockEl.innerHTML = `
        ${orderDisplay ? `<div class="block-order">${orderDisplay}</div>` : ''}
        <div class="block-header" style="background-color: ${blockDef.color}">
            <span class="block-icon">${blockDef.icon}</span>
            <span class="block-title">${blockDef.name}</span>
            <button class="block-delete" onclick="deleteBlock('${block.id}')">&times;</button>
        </div>
        <div class="block-body">
            <div class="block-inputs">
                ${(blockDef.inputs || []).map(input => 
                    `<div class="connection-point input" 
                         data-type="${input}" 
                         data-block-id="${block.id}"
                         title="入力: ${input}"
                         onclick="handleConnectionPoint(event, '${block.id}', '${input}', 'input')"></div>`
                ).join('')}
            </div>
            <div class="block-outputs">
                ${(blockDef.outputs || []).map(output => 
                    `<div class="connection-point output" 
                         data-type="${output}" 
                         data-block-id="${block.id}"
                         title="出力: ${output}"
                         onclick="handleConnectionPoint(event, '${block.id}', '${output}', 'output')"></div>`
                ).join('')}
            </div>
        </div>
    `;

    // イベントリスナー
    blockEl.addEventListener('click', (e) => {
        if (!e.target.classList.contains('block-delete') && 
            !e.target.classList.contains('connection-point')) {
            e.stopPropagation();
            selectBlock(block.id);
        }
    });

    // ドラッグ機能
    makeDraggable(blockEl, block);

    canvas.appendChild(blockEl);
}

function makeDraggable(element, block) {
    let isDragging = false;
    let startX, startY, startBlockX, startBlockY;

    element.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('block-delete') || 
            e.target.classList.contains('connection-point')) {
            return;
        }
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startBlockX = block.x;
        startBlockY = block.y;
        
        element.style.zIndex = '1000';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = (e.clientX - startX) / canvasZoom;
        const deltaY = (e.clientY - startY) / canvasZoom;
        
        block.x = startBlockX + deltaX;
        block.y = startBlockY + deltaY;
        
        element.style.left = `${block.x}px`;
        element.style.top = `${block.y}px`;
        
        updateConnections();
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            element.style.zIndex = '';
        }
    });
}

function handleConnectionPoint(e, blockId, connectionType, direction) {
    e.stopPropagation();
    
    if (!isConnecting) {
        // 接続開始
        startConnection(blockId, connectionType, direction, e.target);
    } else {
        // 接続完了
        completeConnection(blockId, connectionType, direction);
    }
}

function startConnection(blockId, connectionType, direction, element) {
    if (direction !== 'output') return; // 出力からのみ接続開始
    
    isConnecting = true;
    connectionStart = { blockId, connectionType, direction, element };
    
    // 視覚的フィードバック
    element.classList.add('connecting');
    document.getElementById('connectionModeIndicator').classList.add('show');
    
    // すべてのブロックを接続モードに
    document.querySelectorAll('.canvas-block').forEach(block => {
        block.classList.add('connecting-mode');
    });
}

function completeConnection(toBlockId, toConnectionType, toDirection) {
    if (toDirection !== 'input') {
        resetConnectionMode();
        return;
    }
    
    const fromBlockId = connectionStart.blockId;
    const fromConnectionType = connectionStart.connectionType;
    
    // 同じブロックへの接続は禁止
    if (fromBlockId === toBlockId) {
        resetConnectionMode();
        return;
    }
    
    // 既存の接続をチェック
    const existingConnection = connections.find(c => 
        c.from === fromBlockId && c.to === toBlockId &&
        c.fromType === fromConnectionType && c.toType === toConnectionType
    );
    
    if (!existingConnection) {
        // 新しい接続を作成
        const connection = {
            id: `conn_${Date.now()}`,
            from: fromBlockId,
            to: toBlockId,
            fromType: fromConnectionType,
            toType: toConnectionType
        };
        
        connections.push(connection);
        updateConnections();
        updateStats();
        calculateExecutionOrder();
        updateBlockOrders();
    }
    
    resetConnectionMode();
}

function resetConnectionMode() {
    isConnecting = false;
    connectionStart = null;
    
    // 視覚的フィードバックをリセット
    document.querySelectorAll('.connection-point.connecting').forEach(el => {
        el.classList.remove('connecting');
    });
    document.querySelectorAll('.canvas-block.connecting-mode').forEach(block => {
        block.classList.remove('connecting-mode');
    });
    document.getElementById('connectionModeIndicator').classList.remove('show');
}

function selectBlock(blockId) {
    // 前の選択を解除
    document.querySelectorAll('.canvas-block.selected').forEach(el => {
        el.classList.remove('selected');
    });

    // 新しいブロックを選択
    const blockEl = document.querySelector(`[data-block-id="${blockId}"]`);
    blockEl.classList.add('selected');
    selectedBlock = blockId;

    // プロパティパネルを更新
    updatePropertiesPanel(blockId);
}

function updatePropertiesPanel(blockId) {
    const block = canvasBlocks.find(b => b.id === blockId);
    const blockDef = BLOCK_TYPES[block.type];
    const panel = document.getElementById('propertiesContent');

    if (!blockDef.properties) {
        panel.innerHTML = '<div class="no-properties">このブロックにはプロパティがありません</div>';
        return;
    }

    let html = `<div class="properties-form">`;
    
    for (const [key, prop] of Object.entries(blockDef.properties)) {
        const value = block.properties[key] || prop.default;
        
        html += `<div class="property-field">`;
        html += `<label for="prop_${key}">${prop.label}</label>`;
        
        switch (prop.type) {
            case 'text':
            case 'password':
                html += `<input type="${prop.type}" id="prop_${key}" value="${value}" onchange="updateBlockProperty('${blockId}', '${key}', this.value)">`;
                break;
            case 'number':
                html += `<input type="number" id="prop_${key}" value="${value}" onchange="updateBlockProperty('${blockId}', '${key}', this.value)">`;
                break;
            case 'textarea':
                html += `<textarea id="prop_${key}" onchange="updateBlockProperty('${blockId}', '${key}', this.value)">${value}</textarea>`;
                break;
            case 'select':
                html += `<select id="prop_${key}" onchange="updateBlockProperty('${blockId}', '${key}', this.value)">`;
                prop.options.forEach(option => {
                    html += `<option value="${option}" ${option === value ? 'selected' : ''}>${option}</option>`;
                });
                html += `</select>`;
                break;
        }
        html += `</div>`;
    }
    html += `</div>`;
    panel.innerHTML = html;
}

function updateBlockProperty(blockId, property, value) {
    const block = canvasBlocks.find(b => b.id === blockId);
    if (block) {
        block.properties[property] = value;
    }
}

function deleteBlock(blockId) {
    // ブロックを削除
    canvasBlocks = canvasBlocks.filter(b => b.id !== blockId);
    
    // 関連する接続を削除
    connections = connections.filter(c => c.from !== blockId && c.to !== blockId);
    
    // DOM要素を削除
    const blockEl = document.querySelector(`[data-block-id="${blockId}"]`);
    if (blockEl) {
        blockEl.remove();
    }
    
    // 選択解除
    if (selectedBlock === blockId) {
        selectedBlock = null;
        document.getElementById('propertiesContent').innerHTML = '<div class="no-selection"><p>ブロックを選択してプロパティを編集</p></div>';
    }
    
    updateStats();
    updateConnections();
    calculateExecutionOrder();
    updateBlockOrders();
}

function handleCanvasClick(e) {
    if (e.target === e.currentTarget || e.target.classList.contains('canvas-grid')) {
        // 接続モードをリセット
        if (isConnecting) {
            resetConnectionMode();
            return;
        }
        
        // キャンバスの空白部分をクリック
        selectedBlock = null;
        document.querySelectorAll('.canvas-block.selected').forEach(el => {
            el.classList.remove('selected');
        });
        document.getElementById('propertiesContent').innerHTML = '<div class="no-selection"><p>ブロックを選択してプロパティを編集</p></div>';
    }
}

function updateStats() {
    document.getElementById('blockCount').textContent = `ブロック数: ${canvasBlocks.length}`;
    document.getElementById('connectionCount').textContent = `接続数: ${connections.length}`;
}

function updateConnections() {
    const svg = document.getElementById('connectionSvg');
    svg.innerHTML = '';
    
    connections.forEach(connection => {
        drawConnection(connection);
    });
}

function drawConnection(connection) {
    const fromBlock = document.querySelector(`[data-block-id="${connection.from}"]`);
    const toBlock = document.querySelector(`[data-block-id="${connection.to}"]`);
    
    if (!fromBlock || !toBlock) return;
    
    const fromPoint = getConnectionPoint(fromBlock, connection.fromType, 'output');
    const toPoint = getConnectionPoint(toBlock, connection.toType, 'input');
    
    if (!fromPoint || !toPoint) return;
    
    const svg = document.getElementById('connectionSvg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    const d = createCurvedPath(fromPoint, toPoint);
    path.setAttribute('d', d);
    path.setAttribute('class', 'connection-line');
    path.setAttribute('data-connection-id', connection.id);
    
    // 接続線クリックで削除
    path.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('この接続を削除しますか？')) {
            deleteConnection(connection.id);
        }
    });
    
    svg.appendChild(path);
    
    // 矢印を追加
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const arrowMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    arrowMarker.setAttribute('id', `arrow-${connection.id}`);
    arrowMarker.setAttribute('markerWidth', '10');
    arrowMarker.setAttribute('markerHeight', '10');
    arrowMarker.setAttribute('refX', '8');
    arrowMarker.setAttribute('refY', '3');
    arrowMarker.setAttribute('orient', 'auto');
    arrowMarker.setAttribute('markerUnits', 'strokeWidth');
    
    const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arrowPath.setAttribute('d', 'M0,0 L0,6 L9,3 z');
    arrowPath.setAttribute('fill', '#667eea');
    
    arrowMarker.appendChild(arrowPath);
    marker.appendChild(arrowMarker);
    svg.appendChild(marker);
    
    path.setAttribute('marker-end', `url(#arrow-${connection.id})`);
}

function getConnectionPoint(blockEl, connectionType, direction) {
    const point = blockEl.querySelector(`.connection-point.${direction}[data-type="${connectionType}"]`);
    if (!point) return null;
    
    const blockRect = blockEl.getBoundingClientRect();
    const pointRect = point.getBoundingClientRect();
    const canvasRect = document.getElementById('canvas').getBoundingClientRect();
    
    return {
        x: (pointRect.left + pointRect.width / 2 - canvasRect.left) / canvasZoom,
        y: (pointRect.top + pointRect.height / 2 - canvasRect.top) / canvasZoom
    };
}

function createCurvedPath(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const controlOffset = Math.min(distance * 0.5, 100);
    
    const cp1x = from.x + controlOffset;
    const cp1y = from.y;
    const cp2x = to.x - controlOffset;
    const cp2y = to.y;
    
    return `M${from.x},${from.y} C${cp1x},${cp1y} ${cp2x},${cp2y} ${to.x},${to.y}`;
}

function deleteConnection(connectionId) {
    connections = connections.filter(c => c.id !== connectionId);
    updateConnections();
    updateStats();
    calculateExecutionOrder();
    updateBlockOrders();
}

function calculateExecutionOrder() {
    executionOrder = [];
    const visited = new Set();
    const visiting = new Set();
    
    // 開始ブロックを見つける（入力のないブロック）
    const startBlocks = canvasBlocks.filter(block => {
        const blockDef = BLOCK_TYPES[block.type];
        return blockDef.inputs.length === 0 || !connections.some(c => c.to === block.id);
    });
    
    function visit(blockId) {
        if (visiting.has(blockId)) return; // 循環参照をスキップ
        if (visited.has(blockId)) return;
        
        visiting.add(blockId);
        
        // このブロックへの入力接続を処理
        const inputConnections = connections.filter(c => c.to === blockId);
        inputConnections.forEach(conn => visit(conn.from));
        
        visiting.delete(blockId);
        visited.add(blockId);
        executionOrder.push(blockId);
    }
    
    // 開始ブロックから順次処理
    startBlocks.forEach(block => visit(block.id));
    
    // 孤立したブロックも追加
    canvasBlocks.forEach(block => {
        if (!visited.has(block.id)) {
            executionOrder.push(block.id);
        }
    });
}

function updateBlockOrders() {
    canvasBlocks.forEach(block => {
        const blockEl = document.querySelector(`[data-block-id="${block.id}"]`);
        if (blockEl) {
            const existingOrder = blockEl.querySelector('.block-order');
            if (existingOrder) {
                existingOrder.remove();
            }
            
            const order = executionOrder.indexOf(block.id) + 1;
            if (order > 0) {
                const orderEl = document.createElement('div');
                orderEl.className = 'block-order';
                orderEl.textContent = order;
                blockEl.insertBefore(orderEl, blockEl.firstChild);
            }
        }
    });
}

function clearCanvas() {
    if (confirm('すべてのブロックを削除しますか？')) {
        canvasBlocks = [];
        connections = [];
        selectedBlock = null;
        executionOrder = [];
        
        document.querySelectorAll('.canvas-block').forEach(el => el.remove());
        document.getElementById('connectionSvg').innerHTML = '';
        document.getElementById('propertiesContent').innerHTML = '<div class="no-selection"><p>ブロックを選択してプロパティを編集</p></div>';
        
        // ようこそメッセージを表示
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'block';
        }
        
        updateStats();
        resetConnectionMode();
    }
}

function saveWorkflow() {
    const workflow = {
        blocks: canvasBlocks,
        connections: connections,
        executionOrder: executionOrder,
        metadata: {
            name: 'My Workflow',
            created: new Date().toISOString(),
            version: '1.0'
        }
    };
    
    // ローカルストレージに保存（実際のデプロイ用）
    try {
        localStorage.setItem('workflow', JSON.stringify(workflow));
        alert('ワークフローを保存しました！');
    } catch (error) {
        // フォールバック
        workflowStorage.savedWorkflow = workflow;
        alert('ワークフローを保存しました！');
    }
}

function loadWorkflow() {
    try {
        let workflow;
        try {
            const saved = localStorage.getItem('workflow');
            workflow = saved ? JSON.parse(saved) : workflowStorage.savedWorkflow;
        } catch (error) {
            workflow = workflowStorage.savedWorkflow;
        }
        
        if (!workflow) throw new Error('保存されたワークフローがありません');
        
        // 現在のワークフローをクリア
        clearCanvas();
        
        // ブロックを復元
        canvasBlocks = workflow.blocks || [];
        connections = workflow.connections || [];
        executionOrder = workflow.executionOrder || [];
        
        // DOM要素を再作成
        canvasBlocks.forEach(block => {
            renderCanvasBlock(block);
        });
        
        updateStats();
        updateConnections();
        updateBlockOrders();
        
        // ようこそメッセージを非表示
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage && canvasBlocks.length > 0) {
            welcomeMessage.style.display = 'none';
        }
        
        alert('ワークフローを読み込みました！');
    } catch (error) {
        alert('ワークフローの読み込みに失敗しました: ' + error.message);
    }
}

function exportJSON() {
    const workflow = {
        blocks: canvasBlocks,
        connections: connections,
        executionOrder: executionOrder,
        metadata: {
            name: 'Exported Workflow',
            exported: new Date().toISOString(),
            version: '1.0'
        }
    };
    
    document.getElementById('jsonOutput').value = JSON.stringify(workflow, null, 2);
    document.getElementById('jsonModal').style.display = 'block';
}

function copyJSON() {
    const textarea = document.getElementById('jsonOutput');
    textarea.select();
    document.execCommand('copy');
    alert('JSONをコピーしました！');
}

function closeModal() {
    document.getElementById('jsonModal').style.display = 'none';
}

function executeWorkflow() {
    if (canvasBlocks.length === 0) {
        alert('実行するブロックがありません');
        return;
    }
    
    const panel = document.getElementById('executionPanel');
    const content = document.getElementById('executionContent');
    
    content.innerHTML = '<div class="execution-step">🚀 ワークフローを実行中...</div>';
    panel.classList.add('open');
    
    // 実行順序に従ってシミュレーション実行
    setTimeout(() => {
        let html = '';
        executionOrder.forEach((blockId, index) => {
            const block = canvasBlocks.find(b => b.id === blockId);
            if (block) {
                const blockDef = BLOCK_TYPES[block.type];
                html += `
                    <div class="execution-step completed">
                        ${index + 1}. ${blockDef.icon} ${blockDef.name} - 完了
                        <div class="execution-time">${Date.now() + index * 100}ms</div>
                    </div>
                `;
            }
        });
        html += '<div class="execution-summary">✅ ワークフロー実行完了！</div>';
        content.innerHTML = html;
    }, 2000);
}

function closeExecution() {
    document.getElementById('executionPanel').classList.remove('open');
}

function zoomIn() {
    canvasZoom = Math.min(canvasZoom * 1.2, 3);
    applyZoom();
}

function zoomOut() {
    canvasZoom = Math.max(canvasZoom / 1.2, 0.3);
    applyZoom();
}

function applyZoom() {
    const canvas = document.getElementById('canvas');
    canvas.style.transform = `scale(${canvasZoom}) translate(${canvasOffset.x}px, ${canvasOffset.y}px)`;
    updateConnections();
}

function setupEventListeners() {
    // ESCキーで接続モードを終了
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (isConnecting) {
                resetConnectionMode();
            } else {
                closeModal();
                closeExecution();
            }
        }
    });

    // モーダルの背景クリックで閉じる
    document.getElementById('jsonModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            closeModal();
        }
    });
}