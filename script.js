const keyboardLayout = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/']
];

const rowColors = [
    '#f87171', // Red
    '#fbbf24', // Amber
    '#34d399', // Emerald
    '#60a5fa'  // Blue
];

// 自然音阶频率表 (C3 - B6)
const baseFrequencies = [
    130.81, 146.83, 164.81, 174.61, 196.00, 220.00, 246.94, // C3-B3 (A行部分)
    261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, // C4-B4 (Q行部分)
    523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, // C5-B5 (数字行部分)
    1046.50, 1174.66, 1318.51, 1396.91, 1567.98, 1760.00, 1975.53 // C6-B6
];

const noteNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

const keyboardElement = document.getElementById('keyboard');
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// 添加主音量控制和压缩器，防止破音
const masterGain = audioCtx.createGain();
const compressor = audioCtx.createDynamicsCompressor();

masterGain.gain.setValueAtTime(0.6, audioCtx.currentTime);
compressor.threshold.setValueAtTime(-24, audioCtx.currentTime);
compressor.knee.setValueAtTime(40, audioCtx.currentTime);
compressor.ratio.setValueAtTime(12, audioCtx.currentTime);
compressor.attack.setValueAtTime(0, audioCtx.currentTime);
compressor.release.setValueAtTime(0.25, audioCtx.currentTime);

masterGain.connect(compressor);
compressor.connect(audioCtx.destination);

const keyMap = {};

function initKeyboard() {
    let noteIndex = 0;
    // 重新定义每行起始音阶，让布局更合理
    const rowStarts = [14, 7, 0, 0]; // 数字行从 C5 开始，Q行从 C4 开始，A行从 C3 开始
    
    keyboardLayout.forEach((row, rowIndex) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = `keyboard-row row-${rowIndex}`;
        
        let currentRowNoteIndex = rowStarts[rowIndex] || 0;
        
        row.forEach((char) => {
            const keyDiv = document.createElement('div');
            keyDiv.className = 'key';
            keyDiv.dataset.key = char.toUpperCase();
            keyDiv.style.setProperty('--row-color', rowColors[rowIndex]);
            
            const charSpan = document.createElement('span');
            charSpan.className = 'char';
            charSpan.textContent = char;
            
            const noteSpan = document.createElement('span');
            noteSpan.className = 'note';
            
            const freqIndex = currentRowNoteIndex;
            const octave = Math.floor(freqIndex / 7) + 3;
            noteSpan.textContent = noteNames[freqIndex % 7] + octave;
            
            keyDiv.appendChild(charSpan);
            keyDiv.appendChild(noteSpan);
            rowDiv.appendChild(keyDiv);
            
            keyMap[char.toUpperCase()] = {
                element: keyDiv,
                frequency: baseFrequencies[freqIndex] || 440,
                color: rowColors[rowIndex]
            };
            
            currentRowNoteIndex++;
        });
        keyboardElement.appendChild(rowDiv);
    });
}

function playNote(frequency) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const now = audioCtx.currentTime;
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const delayNode = audioCtx.createDelay();
    const feedbackGain = audioCtx.createGain();

    // 混合波形
    osc1.type = 'triangle'; 
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(frequency, now);
    osc2.frequency.setValueAtTime(frequency * 2, now); // 精确高八度叠加，和声更纯净

    // ADSR 包络
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02); // 降低单音量从 0.3 到 0.2
    gainNode.gain.exponentialRampToValueAtTime(0.1, now + 0.2); 
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.2); // 延长释放时间，声音更平滑

    // 延迟/回响
    delayNode.delayTime.value = 0.2;
    feedbackGain.gain.value = 0.2; // 降低反馈音量
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(masterGain); // 连接到 masterGain 而不是 destination
    
    // 连接延迟链路
    gainNode.connect(delayNode);
    delayNode.connect(feedbackGain);
    feedbackGain.connect(delayNode);
    delayNode.connect(masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.2);
    osc2.stop(now + 1.2);
}

function createVisuals(element, color) {
    // 1. 内部涟漪
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    element.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);

    // 2. 向外波纹
    const rect = element.getBoundingClientRect();
    const wave = document.createElement('div');
    wave.className = 'wave';
    wave.style.left = (rect.left + rect.width / 2) + 'px';
    wave.style.top = (rect.top + rect.height / 2) + 'px';
    wave.style.setProperty('--row-color', color);
    document.body.appendChild(wave);
    setTimeout(() => wave.remove(), 1200);
}

function handleKeyPress(key) {
    const keyData = keyMap[key.toUpperCase()];
    if (keyData) {
        // 防止重复触发
        if (keyData.element.classList.contains('active')) return;

        keyData.element.classList.add('active');
        playNote(keyData.frequency);
        createVisuals(keyData.element, keyData.color);
        
        setTimeout(() => {
            keyData.element.classList.remove('active');
        }, 150);
    }
}

// 事件监听
window.addEventListener('keydown', (e) => {
    // 处理特殊键
    let key = e.key;
    if (key === 'Enter') return; // 忽略 Enter
    handleKeyPress(key);
});

// 点击支持
keyboardElement.addEventListener('mousedown', (e) => {
    const keyDiv = e.target.closest('.key');
    if (keyDiv) {
        handleKeyPress(keyDiv.dataset.key);
    }
});

// 提示音：点击页面开始（因为浏览器自动播放限制）
document.body.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}, { once: true });

// 自动播放逻辑
const autoPlayBtn = document.getElementById('autoPlayBtn');
const songSelect = document.getElementById('songSelect');
const scoreDisplay = document.getElementById('scoreDisplay');
const fileUpload = document.getElementById('fileUpload');

let isPlaying = false;

const songs = {
    twinkle: {
        name: '小星星',
        score: '1 1 5 5 | 6 6 5 - | 4 4 3 3 | 2 2 1 -',
        keys: 'Q Q T T | Y Y T - | R R E E | W W Q -',
        lyrics: '一 闪 一 闪 亮 晶 晶，满 天 都 是 小 星 星',
        melody: [
            { key: 'Q', duration: 500 }, { key: 'Q', duration: 500 }, { key: 'T', duration: 500 }, { key: 'T', duration: 500 },
            { key: 'Y', duration: 500 }, { key: 'Y', duration: 500 }, { key: 'T', duration: 1000 },
            { key: 'R', duration: 500 }, { key: 'R', duration: 500 }, { key: 'E', duration: 500 }, { key: 'E', duration: 500 },
            { key: 'W', duration: 500 }, { key: 'W', duration: 500 }, { key: 'Q', duration: 1000 }
        ]
    },
    newyear: {
        name: '新年快乐',
        score: '1 1 1 5 | 3 3 3 1 | 1 3 5 5 | 4 3 2 -',
        keys: 'Q Q Q T | E E E Q | Q E T T | R E W -',
        lyrics: '新 年 快 乐，新 年 快 乐，祝 大 家 新 年 快 乐',
        melody: [
            { key: 'Q', duration: 500 }, { key: 'Q', duration: 500 }, { key: 'Q', duration: 500 }, { key: 'T', duration: 1000 },
            { key: 'E', duration: 500 }, { key: 'E', duration: 500 }, { key: 'E', duration: 500 }, { key: 'Q', duration: 1000 },
            { key: 'Q', duration: 500 }, { key: 'E', duration: 500 }, { key: 'T', duration: 500 }, { key: 'T', duration: 500 },
            { key: 'R', duration: 500 }, { key: 'E', duration: 500 }, { key: 'W', duration: 1000 }
        ]
    },
    gongxi: {
        name: '恭喜发财',
        score: '3 5 6 1\' | 6 5 3 - | 3 2 1 2 | 3 5 3 -',
        keys: 'E T Y I | Y T E - | E W Q W | E T E -',
        lyrics: '恭 喜 呀 恭 喜，发 财 呀 发 财，万 事 呀 如 意',
        melody: [
            { key: 'E', duration: 400 }, { key: 'T', duration: 400 }, { key: 'Y', duration: 400 }, { key: 'I', duration: 800 },
            { key: 'Y', duration: 400 }, { key: 'T', duration: 400 }, { key: 'E', duration: 800 },
            { key: 'E', duration: 400 }, { key: 'W', duration: 400 }, { key: 'Q', duration: 400 }, { key: 'W', duration: 400 },
            { key: 'E', duration: 400 }, { key: 'T', duration: 400 }, { key: 'E', duration: 800 }
        ]
    },
    childhood: {
        name: '童年的回忆 (经典完整版)',
        score: '(序曲) 1 3 5 7 | 1\' 3\' 5\' 7\' | 5 1\' 3\' 5\' | 4\' 3\' 2\' - | 7 2\' 4\' 7\' | 6\' 5\' 4\' -',
        keys: '(爬音) Z C B M | A D H K | Q E T U | 1 3 5 7 | T 1 3 5 | 4 3 2 -',
        lyrics: '理查德·克莱德曼巅峰之作，带你回味纯真的童年时光',
        melody: [
            // --- 经典序曲：流水般的爬音 ---
            { key: 'Z', duration: 150 }, { key: 'C', duration: 150 }, { key: 'B', duration: 150 }, { key: 'M', duration: 150 },
            { key: 'A', duration: 150 }, { key: 'D', duration: 150 }, { key: 'H', duration: 150 }, { key: 'K', duration: 150 },
            { key: 'Q', duration: 150 }, { key: 'E', duration: 150 }, { key: 'T', duration: 150 }, { key: 'U', duration: 150 },
            { key: '1', duration: 150 }, { key: '3', duration: 150 }, { key: '5', duration: 150 }, { key: '7', duration: 600 },
            
            // --- 第一段主题：纯净的旋律 ---
            { key: 'T', duration: 300 }, { key: '1', duration: 300 }, { key: '3', duration: 300 }, { key: '5', duration: 600 },
            { key: '4', duration: 300 }, { key: '3', duration: 300 }, { key: '2', duration: 900 },
            
            { key: 'U', duration: 300 }, { key: '2', duration: 300 }, { key: '4', duration: 300 }, { key: '7', duration: 600 },
            { key: '6', duration: 300 }, { key: '5', duration: 300 }, { key: '4', duration: 900 },

            { key: 'T', duration: 300 }, { key: '1', duration: 300 }, { key: '3', duration: 300 }, { key: '5', duration: 600 },
            { key: '4', duration: 300 }, { key: '3', duration: 300 }, { key: '2', duration: 900 },

            { key: 'W', duration: 300 }, { key: 'T', duration: 300 }, { key: 'U', duration: 300 }, { key: '2', duration: 600 },
            { key: '1', duration: 1200 },

            // --- 第二段：情感升华 (变奏) ---
            { key: '1', duration: 300 }, { key: '2', duration: 300 }, { key: '3', duration: 300 }, { key: '4', duration: 600 },
            { key: '5', duration: 300 }, { key: '6', duration: 300 }, { key: '5', duration: 900 },
            
            { key: '4', duration: 300 }, { key: '3', duration: 300 }, { key: '2', duration: 300 }, { key: '3', duration: 600 },
            { key: '4', duration: 300 }, { key: '5', duration: 300 }, { key: '4', duration: 900 },
            
            { key: '3', duration: 300 }, { key: '4', duration: 300 }, { key: '5', duration: 300 }, { key: '6', duration: 600 },
            { key: '7', duration: 300 }, { key: '8', duration: 300 }, { key: '7', duration: 900 },
            
            // --- 经典的低音过度 ---
            { key: 'Z', duration: 300 }, { key: 'X', duration: 300 }, { key: 'C', duration: 300 }, { key: 'V', duration: 300 },
            { key: 'B', duration: 300 }, { key: 'N', duration: 300 }, { key: 'M', duration: 600 },

            // --- 最终回归：温暖的结局 ---
            { key: 'T', duration: 300 }, { key: '1', duration: 300 }, { key: '3', duration: 300 }, { key: '5', duration: 600 },
            { key: '4', duration: 300 }, { key: '3', duration: 300 }, { key: '2', duration: 1200 },
            
            { key: 'W', duration: 300 }, { key: 'T', duration: 300 }, { key: 'U', duration: 300 }, { key: '2', duration: 600 },
            { key: '1', duration: 3000 }
        ]
    }
};

function updateScoreDisplay(songId) {
    const song = songs[songId];
    if (!song) return;

    scoreDisplay.innerHTML = `
        <span class="segment">${song.score}</span>
        <span class="keys">${song.keys}</span>
        <p class="lyrics">${song.lyrics}</p>
    `;
}

async function playMelody() {
    if (isPlaying) return;
    const currentSong = songs[songSelect.value];
    if (!currentSong) return;

    isPlaying = true;
    autoPlayBtn.textContent = '停止演奏';
    autoPlayBtn.classList.add('playing');

    for (const note of currentSong.melody) {
        if (!isPlaying) break;
        handleKeyPress(note.key);
        await new Promise(resolve => setTimeout(resolve, note.duration));
    }

    isPlaying = false;
    autoPlayBtn.textContent = '自动演奏';
    autoPlayBtn.classList.remove('playing');
}

songSelect.addEventListener('change', () => {
    updateScoreDisplay(songSelect.value);
    if (isPlaying) isPlaying = false; // 切换歌曲时停止播放
});

autoPlayBtn.addEventListener('click', () => {
    if (isPlaying) {
        isPlaying = false;
    } else {
        playMelody();
    }
});

// 本地上传乐谱
fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const uploadedSong = JSON.parse(event.target.result);
            const songId = 'custom_' + Date.now();
            
            // 校验必要的字段
            if (!uploadedSong.name || !uploadedSong.melody) {
                alert('乐谱格式不正确，需要包含 name 和 melody 字段');
                return;
            }

            songs[songId] = {
                name: uploadedSong.name,
                score: uploadedSong.score || '自定义乐谱',
                keys: uploadedSong.keys || '未知按键',
                lyrics: uploadedSong.lyrics || '暂无歌词',
                melody: uploadedSong.melody
            };

            // 添加到下拉菜单
            const option = document.createElement('option');
            option.value = songId;
            option.textContent = uploadedSong.name;
            songSelect.appendChild(option);
            
            // 自动切换到新上传的乐谱
            songSelect.value = songId;
            updateScoreDisplay(songId);
            
            alert('乐谱上传成功！');
        } catch (err) {
            alert('解析乐谱文件失败，请确保是正确的 JSON 格式');
        }
    };
    reader.readAsText(file);
});

// 初始化显示第一个乐谱
updateScoreDisplay(songSelect.value);

initKeyboard();
