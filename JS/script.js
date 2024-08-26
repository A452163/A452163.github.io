// 创建音频上下文和分析器
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 4096; // FFT大小，决定频率的分辨率
const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

// 获取canvas元素并设置绘图环境
const canvas = document.getElementById('audioVisualization');
const ctx = canvas.getContext('2d');
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;
canvas.width = canvasWidth;
canvas.height = canvasHeight;

// 绘制音频可视化
let frameId;
let lastDataArray = new Uint8Array(bufferLength);
let barWidth = (canvasWidth / bufferLength) * 2.5; // 只计算一次

// 增加线条数量的倍数
const increaseFactor = 2; // 例如，增加2倍

function drawAudioVisualization() {
    analyser.getByteFrequencyData(dataArray);

    // 检查数据是否有变化
    let dataChanged = false;
    for (let i = 0; i < bufferLength; i++) {
        if (dataArray[i] !== lastDataArray[i]) {
            dataChanged = true;
            break;
        }
    }

    if (dataChanged) {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        let x = 0;

        for (let i = 0; i < bufferLength * increaseFactor; i++) {
            let originalIndex = Math.floor(i / increaseFactor);
            let barHeight = dataArray[originalIndex] * 2; // 应用放大因子

            // 创建渐变颜色
            let gradient = ctx.createLinearGradient(x, canvasHeight, x, canvasHeight - barHeight);
            gradient.addColorStop(0, `rgb(255,${Math.floor(barHeight / 1.5)},${Math.floor(barHeight / 3)})`);
            gradient.addColorStop(1, `rgb(255,0,0)`);

            // 设置阴影
            ctx.shadowBlur = 10;
            ctx.shadowColor = `rgb(255,${Math.floor(barHeight / 1.5)},${Math.floor(barHeight / 3)})`;

            // 绘制条形
            ctx.fillStyle = gradient;
            ctx.fillRect(x, canvasHeight - barHeight, barWidth / increaseFactor, barHeight);

            x += (barWidth / increaseFactor) + 1;
        }

        // 更新lastDataArray
        lastDataArray.set(dataArray);
    }

    frameId = requestAnimationFrame(drawAudioVisualization);
}

// 停止绘制音频可视化
function stopDrawAudioVisualization() {
    cancelAnimationFrame(frameId);
}

// 将音频源连接到分析器
function connectAudioSource(audio, analyser) {
    const source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
}

// 初始化音频播放器时，连接音频源到分析器
function initializeAudios(audioConfigs) {
    return audioConfigs.map(audioInfo => {
        const audio = new Audio(audioInfo.file);
        audio.loop = false;
        connectAudioSource(audio, analyser); // 连接音频源到分析器
        return { audio, container: document.querySelector(`#${audioInfo.containerId}`) };
    });
}

// 绑定点击事件
function bindAudioClickEvents(audios) {
    audios.forEach(({ audio, container }) => {
        if (container) {
            container.addEventListener('click', function() {
                const others = audios.filter(other => other.audio !== audio);
                others.forEach(other => other.audio.pause());

                if (audio.paused) {
                    audio.currentTime = 0;
                    audio.play();
                } else {
                    audio.pause();
                }
            });

            audio.addEventListener('ended', function() {
                audio.currentTime = 0;
                audio.play();
            });
        }
    });
}

// 在DOM加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    const audios = initializeAudios([
        { file: 'AUTOMOTIVO BAYSIDE.mp3', containerId: 'container1' },
        { file: 'ONCE UPON A TIME.mp3', containerId: 'container2' },
        { file: 'AUTOMOTIVO BAYSIDE 2.0.mp3', containerId: 'container3' },
        { file: 'AUTOMOTIVO BAYSIDE 3.0.mp3', containerId: 'container4' },
        { file: 'ROMANCE GARBAGE.mp3', containerId: 'container5' }
    ]);

    bindAudioClickEvents(audios);

    // 开始绘制音频可视化
    drawAudioVisualization();
});

// 当需要停止动画时，可以调用 stopDrawAudioVisualization();
