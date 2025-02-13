// 将 AudioContext 声明为 let,方便后续赋值
let audioContext;
let analyser;
let audioInitialized = false;

// 添加全局状态追踪当前播放的音频
let currentlyPlaying = null;
let isPlayingLocked = false;

// 添加循环播放状态
let isLooping = false;

// 添加可视化相关变量
let canvas;
let canvasCtx;
let animationId;

// 添加全局变量声明
let time = 0; // 添加 time 变量并初始化

// 添加新的变量来跟踪拖动位置
let dragTransformX = 0;
let dragTransformY = 0;

// 添加全局渐变值
let globalOpacity = 1;
let fadeStartTime = 0;

// 修改可视化配置对象
const VISUALIZATION_CONFIG = {
    fadeOutDuration: 1,  // 新增：统一的淡出时间（秒）
    particle: {
        rings: [
            {
                count: 60,             // 更多粒子
                direction: 1,          
                speedMultiplier: 1.2,  // 加快速度
                radiusMultiplier: 1,   
                hueOffset: 0,
                sizeMultiplier: 1.2,   // 新增:大小倍数
                opacityMultiplier: 1   // 新增:透明度倍数
            },
            {
                count: 48,            
                direction: -1,         
                speedMultiplier: 0.9,  
                radiusMultiplier: 0.8,
                hueOffset: 60,
                sizeMultiplier: 1,
                opacityMultiplier: 0.9
            },
            {
                count: 36,            
                direction: 1,         
                speedMultiplier: 1.4, 
                radiusMultiplier: 0.6,
                hueOffset: 120,
                sizeMultiplier: 0.8,
                opacityMultiplier: 0.8
            },
            {   // 新增第四环
                count: 72,            
                direction: -1,        
                speedMultiplier: 0.7, 
                radiusMultiplier: 1.2,
                hueOffset: 180,
                sizeMultiplier: 1.4,
                opacityMultiplier: 0.7
            },
            {   // 新增第五环
                count: 24,           
                direction: 1,        
                speedMultiplier: 1.6,
                radiusMultiplier: 0.4,
                hueOffset: 240,
                sizeMultiplier: 0.6,
                opacityMultiplier: 1
            }
        ],
        minSize: 2,             
        maxSize: 12,            // 粒子最大尺寸
        opacity: 0.9,           // 基础透明度
        hueSpeed: 150,          // 色相变化速度
        colorSaturation: 80,    // 饱和度
        colorLightness: 60,     // 亮度
    },
    animation: {
        timeStep: 0.015,
        maxDistanceRatio: 0.85,    // 减小最大范围
        baseDistance: 0.45,        // 减小基础距离
        distanceScale: 0.8,        // 减小缩放因子
        frequencyInfluence: 0.8    // 减小频率影响
    },
    container: {
        minScale: 1,            // 修改：保持最小缩放为1
        baseScale: 1,           
        scaleRange: 0.2,        
        maxScaleIncrease: 0.3,  
        rotationFactor: 120,    
        pulseEnabled: true,     
    }
};

// 定义音频文件列表
const audioFiles = [
    { file: '../AUTOMOTIVO BAYSIDE.mp3', containerId: 'container1' },
    { file: '../ONCE UPON A TIME.mp3', containerId: 'container2' },
    { file: '../AUTOMOTIVO BAYSIDE 2.0.mp3', containerId: 'container3' },
    { file: '../AUTOMOTIVO BAYSIDE 3.0.mp3', containerId: 'container4' },
    { file: '../ROMANCE GARBAGE.mp3', containerId: 'container5' },
    { file: '../I BELIEVE.mp3', containerId: 'container6' },
    { file: '../SWEET RALLY.mp3', containerId: 'container7' },
    { file: '../MY WAY.mp3', containerId: 'container8' },
    { file: '../EU SENTO GABU.mp3', containerId: 'container14' },
    { file: '../蜘蛛糸モノポリー.mp3', containerId: 'container15' },
    { file: '../ECLIPSE!.mp3', containerId: 'container16' },
    { file: '../GIGACHAD FUNK.mp3', containerId: 'container17' },
    { file: '../BRODYAGA FUNK.mp3', containerId: 'container18' },
    { file: '../SimpsonWave1995.mp3', containerId: 'container19' },
    { file: '../WE NEVER.mp3', containerId: 'container20' },
    { file: '../親愛なるあなたは火葬.mp3', containerId: 'container21' },
    { file: '../BLUE HORIZON FUNK.mp3', containerId: 'container22' },
    { file: '../BLUE HORIZON FUNK REMIX!.mp3', containerId: 'container23' },
    { file: '../HYPNOTIC.mp3', containerId: 'container24' },
    { file: '../MONTAGEM-WTF.mp3', containerId: 'container25' },
    { file: '../VAPO-NO-SETOR.mp3', containerId: 'container26' },
    { file: '../Two Different Worlds.mp3', containerId: 'container27' },
    { file: '../PROTECTION CHARM.mp3', containerId: 'container28' },
    { file: '../PROTECTION CHARM (Slowed+Reverb).mp3', containerId: 'container29' },

];

// 添加调试日志
const initAudioContext = async () => {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 32768;
            console.log('AudioContext 状态:', audioContext.state);
            return true;
        } catch (error) {
            console.error('初始化 AudioContext 失败:', error);
            return false;
        }
    }
    return audioContext.state === 'running';
};

// 修改可视化初始化
const initVisualization = () => {
    canvas = document.getElementById('audio');
    if (!canvas) {
        console.error('找不到 audio canvas 元素');
        return;
    }

    canvasCtx = canvas.getContext('2d');

    // 设置 canvas 尺寸
    const resizeCanvas = () => {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 配置分析器
    analyser.fftSize = 32768;
    const bufferLength = analyser.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength); // 声明并初始化 frequencyData

    // 开始可视化
    const draw = () => {
        // 获取 canvas 尺寸
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const size = Math.min(canvasWidth, canvasHeight) * 0.45;

        // 清除画布
        canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);

        // 初始化音频数据
        let averageFrequency = 0;
        
        // 只在音频系统初始化后才获取频率数据
        if (audioInitialized && analyser) {
            const bufferLength = analyser.frequencyBinCount;
            const frequencyData = new Uint8Array(bufferLength);
            analyser.getByteFrequencyData(frequencyData);
            averageFrequency = frequencyData.reduce((sum, value) => sum + value, 0) / frequencyData.length / 255;
        }

        // 计算脉冲效果
        const pulse = Math.sin(time * 0.8) * 0.5;
        
        // 更新全局透明度
        if (!currentlyPlaying && globalOpacity > 0) {
            if (fadeStartTime === 0) {
                fadeStartTime = time;
            }
            const fadeProgress = (time - fadeStartTime) / VISUALIZATION_CONFIG.fadeOutDuration;
            globalOpacity = Math.max(0, 1 - fadeProgress);
        } else if (currentlyPlaying) {
            globalOpacity = 1;
            fadeStartTime = 0;
        }

        // 修改粒子绘制逻辑
        VISUALIZATION_CONFIG.particle.rings.forEach((ring, index) => {
            for (let i = 0; i < ring.count; i++) {
                // 如果正在播放，使用音频数据；如果已停止，使用最后的状态
                const frequency = currentlyPlaying ? 
                    averageFrequency : 
                    (canvasCtx.lastFrequency || 0);
                
                // 保存最后的频率值
                canvasCtx.lastFrequency = currentlyPlaying ? averageFrequency : canvasCtx.lastFrequency;

                const distance = (VISUALIZATION_CONFIG.animation.baseDistance + 
                    frequency * VISUALIZATION_CONFIG.animation.distanceScale) * 
                    Math.min(canvasWidth, canvasHeight) * 
                    VISUALIZATION_CONFIG.animation.maxDistanceRatio * 
                    ring.radiusMultiplier;

                const angle = (i * (Math.PI * 2) / ring.count) + 
                    (time * ring.direction * ring.speedMultiplier);

                const x = centerX + Math.cos(angle) * distance;
                const y = centerY + Math.sin(angle) * distance;

                // 计算粒子大小
                const size = (VISUALIZATION_CONFIG.particle.minSize + 
                    frequency * (VISUALIZATION_CONFIG.particle.maxSize - VISUALIZATION_CONFIG.particle.minSize)) * 
                    ring.sizeMultiplier;

                // 计算颜色和透明度
                const hue = (time * VISUALIZATION_CONFIG.particle.hueSpeed + ring.hueOffset) % 360;
                const opacity = VISUALIZATION_CONFIG.particle.opacity * 
                    ring.opacityMultiplier * 
                    globalOpacity;

                canvasCtx.fillStyle = `hsla(${hue}, ${VISUALIZATION_CONFIG.particle.colorSaturation}%, ${VISUALIZATION_CONFIG.particle.colorLightness}%, ${opacity})`;
                canvasCtx.beginPath();
                canvasCtx.arc(x, y, size, 0, Math.PI * 2);
                canvasCtx.fill();
            }
        });

        // 更新容器动画
        const container = canvas.parentElement;
        if (container) {
            const containerPulse = Math.sin(time * 2) * 0.03;
            
            // 计算动画scale - 停止时保持最后的状态
            const lastScale = parseFloat(container.getAttribute('data-animation-scale')) || 1;
            const targetScale = currentlyPlaying ? 
                VISUALIZATION_CONFIG.container.baseScale + 
                (averageFrequency * VISUALIZATION_CONFIG.container.scaleRange) :
                lastScale;

            // 计算旋转 - 停止时保持最后的状态
            const lastRotation = parseFloat(container.getAttribute('data-animation-rotation')) || 0;
            const rotation = currentlyPlaying ? 
                (time * VISUALIZATION_CONFIG.container.rotationFactor * 
                (1 + averageFrequency * 0.005)) % 360 : 
                lastRotation;

            // 保存动画值
            container.setAttribute('data-animation-scale', targetScale);
            container.setAttribute('data-animation-rotation', rotation);
            
            // 更新transform
            updateContainerTransform();
            
            // 只更新opacity
            container.style.opacity = currentlyPlaying ? '1' : '0';
            container.style.transition = `opacity ${VISUALIZATION_CONFIG.fadeOutDuration}s ease-out`;
        }

        // 添加canvas的transition样式
        canvasCtx.canvas.style.transition = `opacity ${VISUALIZATION_CONFIG.fadeOutDuration}s ease-out`;

        // 更新时间
        time += VISUALIZATION_CONFIG.animation.timeStep;
        
        // 请求下一帧
        animationId = requestAnimationFrame(draw);
    };

    draw();
};

// 修改音频初始化流程
const initAudioSystem = async () => {
    if (audioInitialized) {
        console.log('Audio system already initialized');
        return;
    }

    try {
        if (await initAudioContext()) {
            console.log('AudioContext initialized after user gesture');
            analyser = audioContext.createAnalyser();
            initVisualization();
            audioInitialized = true;

            const containers = await loadAudioFiles(audioFiles);
            console.log(`Loaded ${containers.length} audio files`);

            addEventListeners(containers);

            return containers;
        }
    } catch (error) {
        console.error('初始化音频系统失败:', error);
        audioInitialized = false;
        throw error;
    }
};

// 音频初始化检查
const checkAudioInit = () => !audioInitialized ?
    Promise.reject(new Error('请等待音频系统初始化完成')) :
    Promise.resolve();

// 修改音频加载函数
const loadAudioFiles = async (files) => {
    try {
        await checkAudioInit();

        const audioElements = await Promise.all(files.map(async (file) => {
            const audio = new Audio(file.file);

            // 使用三元运算符处理音频结束事件
            audio.addEventListener('ended', () =>
                isLooping && currentlyPlaying === audio ?
                    (audio.currentTime = 0, audio.play()) :
                    (currentlyPlaying = null)
            );

            await new Promise((resolve, reject) => {
                audio.addEventListener('canplaythrough', resolve, { once: true });
                audio.addEventListener('error', reject);
                audio.load();
            });

            const source = audioContext.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(audioContext.destination);

            return { audio, source };
        }));

        // 使用三元运算符处理点击事件
        const containers = audioElements.map((el, index) => {
            const container = document.getElementById(files[index].containerId);
            container.addEventListener('click', async () => {
                if (isPlayingLocked) return;
                isPlayingLocked = true;

                try {
                    const audio = el.audio;
                    audio === currentlyPlaying ?
                        (audio.pause(), audio.currentTime = 0, currentlyPlaying = null, isLooping = false) :
                        (currentlyPlaying?.pause(), currentlyPlaying = audio, audio.currentTime = 0,
                            await audio.play(), isLooping = true);
                } catch (error) {
                    console.error('播放音频时出错:', error);
                    currentlyPlaying?.pause();
                    currentlyPlaying = null;
                    isLooping = false;
                } finally {
                    isPlayingLocked = false;
                }
            });
            return container;
        });

        return containers;
    } catch (error) {
        console.error('加载音频文件失败:', error);
        throw error;
    }
};

// 获取页面中的图形元素
const graphicElement = document.querySelector('.g');

// 线性插值函数
const lerp = (start, end, t) => (1 - t) * start + t * end;

// 动画循环函数
const animate = () => {
    analyser.getByteFrequencyData(frequencyData);
    const averageFrequency = frequencyData.reduce((sum, value) => sum + value, 0) / frequencyData.length;

    // 使用 Math.min 限制 currentValue
    const currentValue = Math.min(averageFrequency * 2.5, 999999);
    const currentWidth = parseFloat(graphicElement.style.width) || 0;

    // 插值效果
    graphicElement.style.width = `${lerp(currentWidth, currentValue, 0.2)}px`; // 插值系数调整为0.2
    graphicElement.style.height = graphicElement.style.width; // 维持正方形

    // 计算新的 transform，增加右偏移量和旋转效果
    graphicElement.style.position = 'fixed'; // 使用 fixed 定位
    graphicElement.style.transform = `translate(-50%, -50%) translateX(0px) scale(${1 + averageFrequency / 1000}) rotate(${averageFrequency / 0.2}deg)`;

    // 动态整背景颜色，加入颜色渐变
    const colorFactor = Math.min(255, averageFrequency * 2);
    const bgColor = `rgba(${colorFactor}, 100, ${255 - colorFactor}, 0.5)`;
    graphicElement.style.backgroundColor = bgColor;

    // 添加波纹效果，动态调整阴影
    graphicElement.style.boxShadow = `0 0 ${Math.min(25, colorFactor)}px rgba(0, 0, 0, 0.5), 0 0 ${Math.min(35, colorFactor)}px rgba(173, 216, 230, 0.6)`;

    // 动态边框样式，调整边框宽度
    graphicElement.style.border = `5px solid rgba(${colorFactor}, 100, 150, 0.7)`;

    // 添加活力效果，增加旋转速度
    graphicElement.style.transition = 'transform 0.1s ease-in-out, opacity 0.5s ease-in-out';
    graphicElement.style.transform = `translate(-50%, -50%) translateX(0px) scale(${1 + averageFrequency / 1000}) rotate(${averageFrequency / 0.2}deg)`;

    // 动态调整透明度
    graphicElement.style.opacity = averageFrequency > 50 ? '1' : '0.5';

    requestAnimationFrame(animate);
};


// 保存内容函数
const saveContent = (content) => {
    let savedContents = JSON.parse(localStorage.getItem('savedContents')) || [];
    savedContents.push(content);
    localStorage.setItem('savedContents', JSON.stringify(savedContents));
};


// 加载并显示已保存的内容
const loadSavedContent = () => {
    const savedContents = JSON.parse(localStorage.getItem('savedContents')) || [];
    const savedContentDiv = document.getElementById('savedContent');
    savedContentDiv.innerHTML = ''; // 清空已有内容
    savedContents.forEach(content => {
        const contentElement = document.createElement('p');
        contentElement.textContent = content;
        savedContentDiv.appendChild(contentElement);
    });
};


// 页面加载完成后执行初始化
document.addEventListener('DOMContentLoaded', () => {
    const commentInput = document.getElementById('commentInput');
    commentInput.style.resize = window.innerWidth < 768 ? 'vertical' : 'none';

    // 等待用户交互来初始化音频系统
    document.addEventListener('click', async () => {
        if (!audioInitialized) {
            await initAudioSystem();
        }
    }, { once: true });
});


// 修改事件监听器添加函数
const addEventListeners = (audioContainers) => {
    audioContainers.forEach(({ audio, container }) => {
        container?.addEventListener('click', async () => {
            if (isPlayingLocked) return;

            try {
                isPlayingLocked = true;
                await audioContext.resume();

                // 如果点击的是当前正在播放的音频
                if (currentlyPlaying === audio) {
                    if (isLooping) {
                        // 如果正在循环播放，停止循环
                        isLooping = false;
                        audio.pause();
                        audio.currentTime = 0;
                        currentlyPlaying = null;
                    } else {
                        // 如果没有循环播放，开始循环
                        isLooping = true;
                        if (audio.currentTime === 0 || audio.ended) {
                            await audio.play();
                        }
                    }
                } else {
                    // 如果有其他音频在播放，先停止它
                    if (currentlyPlaying) {
                        currentlyPlaying.pause();
                        currentlyPlaying.currentTime = 0;
                        isLooping = false;
                    }

                    // 播放新的音频并开启循环
                    audio.currentTime = 0;
                    await audio.play();
                    currentlyPlaying = audio;
                    isLooping = true;
                }

                console.log('Playing:', audio.src, 'Looping:', isLooping);
            } catch (error) {
                console.error('播放音频时出错:', error);
                if (currentlyPlaying) {
                    currentlyPlaying.pause();
                    currentlyPlaying.currentTime = 0;
                }
                currentlyPlaying = null;
                isLooping = false;
            } finally {
                isPlayingLocked = false;
            }
        });
    });
};


import { GIST_ID, GITHUB_TOKEN } from './config.js';

window.onload = function () {
    const introPopup = document.getElementById('introPopup');
    const closePopupButton = document.getElementById('closePopup');
    const commentInput = document.getElementById('commentInput');
    const submitCommentButton = document.getElementById('submitComment');
    const commentDisplay = document.getElementById('commentDisplay');

    // 显示弹出框并禁用滚动
    introPopup.classList.add('show');
    document.body.classList.add('no-scroll');

    // 关闭弹出框并重新启用滚动
    closePopupButton.addEventListener('click', function () {
        introPopup.classList.remove('show');
        document.body.classList.remove('no-scroll');

        setTimeout(() => {
            introPopup.style.visibility = 'hidden';
        }, 500);
    });

    // 修改这里：将 addCommentToGist 改为 addComment
    submitCommentButton.addEventListener('click', function () {
        const comment = commentInput.value.trim();
        const imageInput = document.getElementById('imageInput');
        const imageFile = imageInput.files[0];

        if (comment || imageFile) {
            addComment(comment, imageFile); // 使用正确的函数名
            commentInput.value = ''; // 清空输入框
            imageInput.value = ''; // 清空图片选择
            document.getElementById('imagePreview').innerHTML = ''; // 清空预览
        }
    });

    // 加载评论
    loadCommentsFromGist();

    // 在适当的地方（比如页面加载完成后）显示 overlayContainer
    document.getElementById('overlayContainer').classList.add('show');

    // 在关闭按钮的点击事件中隐藏 overlayContainer
    document.getElementById('closePopup').addEventListener('click', function () {
        document.getElementById('overlayContainer').classList.remove('show');
    });
};

// 修改加载评论函数
async function loadCommentsFromGist() {
    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        });
        const data = await response.json();

        let comments = [];
        try {
            comments = JSON.parse(data.files['comments.json'].content);
        } catch (parseError) {
            console.error('JSON解析错误，重置评论:', parseError);
            comments = [];
            await updateGist([]);
        }

        displayComments(comments);
    } catch (error) {
        console.error('加载评论时出错:', error);
    }
}


// 修改显示评论的函数，添加上下箭头按钮
function displayComments(comments) {
    const commentDisplay = document.getElementById('commentDisplay');
    commentDisplay.innerHTML = '';
    comments.forEach((comment, index) => {
        const commentElement = document.createElement('div');
        commentElement.className = 'comment-item';

        const textHtml = comment.text ? `<div class="comment-text">${comment.text}</div>` : '';
        
        // 添加上下箭头按钮
        const moveButtons = `
            <div class="comment-controls">
                <button class="delete-comment" data-index="${index}">删除</button>
                <button class="move-up" data-index="${index}" ${index === 0 ? 'disabled' : ''}>
                    <span class="arrow-up">↑</span>
                </button>
                <button class="move-down" data-index="${index}" ${index === comments.length - 1 ? 'disabled' : ''}>
                    <span class="arrow-down">↓</span>
                </button>
            </div>
        `;

        commentElement.innerHTML = `
            <div class="comment-content">
                ${comment.image ? `<img src="${comment.image}" class="comment-image" alt="评论图片">` : ''}
                ${textHtml}
                ${moveButtons}
            </div>
        `;

        commentElement.style.opacity = '0';
        commentElement.style.transform = 'rotateX(-90deg) translateY(30px)';
        commentDisplay.appendChild(commentElement);

        requestAnimationFrame(() => {
            commentElement.classList.add('comment-new');
        });

        commentElement.addEventListener('mousemove', (e) => {
            const rect = commentElement.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;

            commentElement.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;

            const content = commentElement.querySelector('.comment-content');
            content.style.transform = `rotateX(${-rotateX}deg) rotateY(${-rotateY}deg)`;

            // 只在存在文本元素时添加3D效果
            const text = commentElement.querySelector('.comment-text');
            if (text) {
                text.style.transform = `translateZ(20px) rotateX(${-rotateX * 1.5}deg) rotateY(${-rotateY * 1.5}deg)`;
            }
        });

        commentElement.addEventListener('mouseleave', () => {
            commentElement.style.transform = 'rotateX(0) rotateY(0) scale(1)';
            const content = commentElement.querySelector('.comment-content');
            content.style.transform = 'rotateX(0) rotateY(0)';

            // 同样检查文本元素是否存在
            const text = commentElement.querySelector('.comment-text');
            if (text) {
                text.style.transform = 'translateZ(0) rotateX(0) rotateY(0)';
            }
        });
    });
}

// 添加图片压缩函数
async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // 计算压缩比例
                const maxSize = 800; // 最大尺寸
                if (width > height && width > maxSize) {
                    height *= maxSize / width;
                    width = maxSize;
                } else if (height > maxSize) {
                    width *= maxSize / height;
                    height = maxSize;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // 压缩图片质量
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
                resolve(compressedDataUrl);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// 修改添加评论函数
async function addComment(comment, imageFile) {
    try {
        let imageUrl = '';
        if (imageFile) {
            // 检查文件大小
            if (imageFile.size > 5 * 1024 * 1024) {
                alert('图片太大，请选择小于5MB的图片');
                return;
            }
            imageUrl = await compressImage(imageFile);
        }

        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        });
        const data = await response.json();
        let comments = [];
        try {
            comments = JSON.parse(data.files['comments.json'].content);
        } catch (error) {
            comments = [];
        }

        // 修改这里：确保评论文本为空字符串而不是undefined
        const sanitizedComment = comment ? comment.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\uFFFD\uFFFE\uFFFF]/g, '') : '';

        comments.push({
            text: sanitizedComment, // 使用处理后的文本
            image: imageUrl,
            timestamp: new Date().toISOString()
        });

        await updateGist(comments);

        // 清空入
        document.getElementById('commentInput').value = '';
        document.getElementById('imageInput').value = '';
        document.getElementById('imagePreview').innerHTML = '';

        await loadCommentsFromGist();
    } catch (error) {
        console.error('添加评论时出错:', error);
        alert('添加评论失败，请稍后重试');
    }
}

// 修改更新Gist函数
async function updateGist(comments) {
    try {
        const sanitizedComments = comments.map(comment => ({
            text: String(comment.text || '').replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\uFFFD\uFFFE\uFFFF]/g, ''),
            image: comment.image || '',
            timestamp: comment.timestamp || new Date().toISOString()
        }));

        const content = JSON.stringify(sanitizedComments, null, 2);

        // 检查内容大小
        if (content.length > 900000) { // GitHub Gist 有大小限制
            throw new Error('评论内容太大，请删除一些旧评论');
        }

        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                files: {
                    'comments.json': {
                        content: content
                    }
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('更新Gist时出错:', error);
        throw error;
    }
}

// 修改删除论的函数
function deleteComment(index) {
    const commentElement = document.querySelector(`[data-index="${index}"]`).parentNode;
    commentElement.classList.add('comment-delete');

    setTimeout(() => {
        fetch(`https://api.github.com/gists/${GIST_ID}`, {
            method: 'GET',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        })
            .then(response => response.json())
            .then(data => {
                const comments = JSON.parse(data.files['comments.json'].content);
                comments.splice(index, 1);
                return updateGist(comments);
            })
            .then(() => loadCommentsFromGist())
            .catch(error => console.error('删除评论时出错:', error));
    }, 600); // 匹配动画持续时间
}


// 为评论显示区域添加事件委托
document.getElementById('commentDisplay').addEventListener('click', function (event) {
    const target = event.target;
    
    // 获取最近的带有data-index的按钮
    const button = target.closest('button[data-index]');
    if (!button) return;

    const index = parseInt(button.getAttribute('data-index'));

    if (button.classList.contains('delete-comment')) {
        deleteComment(index);
    } else if (button.classList.contains('move-up')) {
        moveComment(index, 'up');
    } else if (button.classList.contains('move-down')) {
        moveComment(index, 'down');
    }
});

// 显示overlayContainer
function showOverlay() {
    document.getElementById('overlayContainer').classList.add('show');
}

// 隐藏overlayContainer
function hideOverlay() {
    document.getElementById('overlayContainer').classList.remove('show');
}

// 在适当的地方调用showOverlay()来显覆盖层
// 例如,页面加载完成后或点击某个按钮时

// 为关闭按钮添加点击事件
document.getElementById('closePopup').addEventListener('click', hideOverlay);

function toggleIntroPopup() {
    const popup = document.getElementById('introPopup');
    popup.classList.toggle('show');
}

document.getElementById('closePopup').addEventListener('click', toggleIntroPopup);

// 在需要显示自我介绍弹窗的地方调用 toggleIntroPopup()

// 鼠标移动事件监听器，增强视差效果
document.addEventListener('mousemove', (e) => {
    const { clientX, clientY } = e;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const rotateX = (clientY - centerY) / 50;
    const rotateY = (centerX - clientX) / 50;

    graphicElement.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
});

// 粒子效果
const particles = [];
const createParticle = () => {
    const particle = document.createElement('div');
    particle.className = 'particle';
    document.body.appendChild(particle);
    particles.push(particle);
};

const updateParticles = () => {
    particles.forEach((particle, index) => {
        const size = Math.random() * 5 + 1;
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        const opacity = Math.random();
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.opacity = opacity;
        particle.style.transition = 'all 0.5s ease-out';
    });
};

setInterval(() => {
    createParticle();
    updateParticles();
}, 1000);

// 添加图片预览功能
document.getElementById('imageInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = document.getElementById('imagePreview');
            preview.innerHTML = `<img src="${e.target.result}" alt="预图片">`;
        }
        reader.readAsDataURL(file);
    }
});

// 优化图片点击放大功能
function setupImageModal() {
    // 创建模态框元素
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    document.body.appendChild(modal);

    // 为所有评论图片添加点击事件
    document.addEventListener('click', async function (e) {
        if (e.target.classList.contains('comment-image')) {
            const img = e.target;

            modal.innerHTML = `
                <div class="modal-content">
                    <img src="${img.src}" alt="放大图片">
                    <span class="close-modal">&times;</span>
                </div>
            `;

            // 重置任何可能的定位样式
            const modalContent = modal.querySelector('.modal-content');
            modalContent.style.transform = 'scale(0.8)';

            // 显示模态框
            modal.style.visibility = 'visible';
            requestAnimationFrame(() => {
                modal.classList.add('show');
                modalContent.classList.add('show');
            });

            document.body.style.overflow = 'hidden';
        }
    });

    // 关闭模态框的函数
    function closeModal() {
        const modalContent = modal.querySelector('.modal-content');
        modal.classList.remove('show');
        modalContent?.classList.remove('show');

        // 等待动画完成后隐藏
        setTimeout(() => {
            modal.style.visibility = 'hidden';
            document.body.style.overflow = '';
        }, 300);
    }

    // 点击模态框关闭
    modal.addEventListener('click', function (e) {
        if (e.target.classList.contains('image-modal') ||
            e.target.classList.contains('close-modal')) {
            closeModal();
        }
    });

    // ESC键关闭模态框
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            closeModal();
        }
    });
}

// 在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', setupImageModal);

// 修改键盘音效函数
const createKeySound = () => {
    const duration = 0.12; // 延长持续时间
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
        const t = i / sampleRate;

        // 主要的击键声 - 降低频率，增加厚重感
        const mainStrike = Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-25 * t) * 0.8;

        // 键帽回弹声音
        const bounce = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-20 * t) * 0.4;

        // 底部缓冲声音
        const cushion = (
            Math.sin(2 * Math.PI * 600 * t) * Math.exp(-15 * t) * 0.5 +   // 低频缓冲
            Math.sin(2 * Math.PI * 400 * t) * Math.exp(-10 * t) * 0.3     // 更低的频率
        );

        // 轻微的塑料外壳共振
        const case_resonance = Math.sin(2 * Math.PI * 300 * t) * Math.exp(-8 * t) * 0.2;

        // 非常轻微的机械噪声
        const noise = (Math.random() * 2 - 1) * Math.exp(-50 * t) * 0.05;

        // 组合所有声音成分
        data[i] = (mainStrike + bounce + cushion + case_resonance + noise) * 0.15;
    }

    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    const filterNode = audioContext.createBiquadFilter();

    // 添加低通滤波器使声音更圆润
    filterNode.type = 'lowpass';
    filterNode.frequency.value = 2000;
    filterNode.Q.value = 0.7;

    source.buffer = buffer;
    source.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // 更自然的音量包络
    gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    source.start();
};

// 在页面加载完成后添加样式
document.addEventListener('DOMContentLoaded', () => {
    const commentInput = document.getElementById('commentInput');
    commentInput.style.resize = window.innerWidth < 768 ? 'vertical' : 'none';
});

// 添加 canvas 尺寸调整函数
const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight / 3;
};

// 添加可视化函数
const visualize = () => {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
        animationId = requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);

        canvasCtx.fillStyle = 'rgb(0, 0, 0)';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 2;

            canvasCtx.fillStyle = `rgb(${barHeight + 100},50,50)`;
            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

            x += barWidth + 1;
        }
    };

    draw();
};

// 在停止播放时停止可视化
const stopVisualization = () => {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
};

// 分离拖动状态
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let elementStartX = 0;
let elementStartY = 0;

const container = document.querySelector('.container.g');

container.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    // 获取当前transform中的translate值
    const transform = window.getComputedStyle(container).transform;
    const matrix = new DOMMatrix(transform);
    // 跳过前两个translate(-50%, -50%)的影响
    dragTransformX = matrix.m41;
    dragTransformY = matrix.m42;

    e.preventDefault();
});

// 添加边界限制
const BOUNDARY_MARGIN = 50; // 安全边距

window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    // 计算新位置
    let newX = dragTransformX + dx;
    let newY = dragTransformY + dy;

    // 获取视口和容器尺寸
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    // 计算边界
    const maxX = viewportWidth - containerWidth / 2 - BOUNDARY_MARGIN;
    const minX = containerWidth / 2 + BOUNDARY_MARGIN;
    const maxY = viewportHeight - containerHeight / 2 - BOUNDARY_MARGIN;
    const minY = containerHeight / 2 + BOUNDARY_MARGIN;

    // 限制在边界内
    newX = Math.min(Math.max(newX, minX), maxX);
    newY = Math.min(Math.max(newY, minY), maxY);

    // 更新拖动位置
    dragTransformX = newX;
    dragTransformY = newY;

    // 应用组合transform
    updateContainerTransform();
});

// 新增：更新容器transform的函数
const updateContainerTransform = () => {
    if (!container) return;
    
    // 获取当前的动画transform值
    const animationScale = container.getAttribute('data-animation-scale') || 1;
    const animationRotation = container.getAttribute('data-animation-rotation') || 0;
    
    // 组合transform，添加居中定位
    container.style.transform = `translate(-50%, -50%) translate(${dragTransformX}px, ${dragTransformY}px) scale(${animationScale}) rotate(${animationRotation}deg)`;
};

window.addEventListener('mouseup', () => {
    isDragging = false;
});

// 添加移动评论的函数
async function moveComment(index, direction) {
    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        });
        const data = await response.json();
        let comments = JSON.parse(data.files['comments.json'].content);

        // 计算目标位置
        const newIndex = direction === 'up' ? index - 1 : index + 1;

        // 检查边界
        if (newIndex < 0 || newIndex >= comments.length) {
            return;
        }

        // 交换位置
        [comments[index], comments[newIndex]] = [comments[newIndex], comments[index]];

        // 更新GIST
        await updateGist(comments);

        // 重新加载评论
        await loadCommentsFromGist();
    } catch (error) {
        console.error('移动评论时出错:', error);
    }
}
