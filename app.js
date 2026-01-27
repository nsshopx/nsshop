import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// --- CONFIG ---
const URL = 'https://ihxdiydlnzpncqdylsla.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloeGRpeWRsbnpwbmNxZHlsc2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5Njg0NDcsImV4cCI6MjA4NDU0NDQ0N30.BYj3iokkcNC88u_xrFRvbFnSdpqbLz_ZWP_zvNWfamc';
const supabase = createClient(URL, KEY);

// --- GLOBAL VARIABLES ---
let allProducts = [];

// 1. LOAD FEED (Auto-Like Calculation ke saath)
async function loadFeed() {
    const feed = document.getElementById('product-feed');
    feed.innerHTML = '<div class="loading-spinner"></div><p style="text-align:center;">Shahi Khazana Load ho raha hai...</p>';

    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });

    if (error) {
        feed.innerHTML = `<p style="text-align:center;">Network Error.</p>`;
    } else if (!data || data.length === 0) {
        feed.innerHTML = `<p style="text-align:center;">Abhi koi product nahi hai.</p>`;
    } else {
        allProducts = data;
        renderCards(allProducts);
    }
}

// 2. RENDER CARDS (Magic Formula yahan hai)
function renderCards(products) {
    const feed = document.getElementById('product-feed');
    
    if(products.length === 0) {
        feed.innerHTML = "<p style='text-align:center'>Koi product nahi mila.</p>";
        return;
    }

    feed.innerHTML = products.map(p => {
        // --- 🤖 AUTO-LIKE LOGIC START 🤖 ---
        const uploadTime = new Date(p.created_at);
        const currentTime = new Date();
        const hoursDiff = Math.abs(currentTime - uploadTime) / 36e5; 
        const effectiveHours = Math.min(hoursDiff, 240); // Max 10 Days
        const fakeLikes = Math.floor(effectiveHours * 1.5); // 1.5 Likes per hour
        const displayLikes = (p.likes || 0) + fakeLikes; // Screen par ye dikhega
        // ------------------------------------

        return `
        <article class="product-card" id="card-${p.id}">
            <div class="img-frame">
                <img src="${p.image_url}" alt="Product" class="product-img" onerror="this.src='https://via.placeholder.com/400'">
            </div>
            
            <div class="card-body">
                <h3 class="product-title">${p.title}</h3>
                
                <a href="${p.affiliate_url}" target="_blank" class="btn-amazon">
                    🛒 Buy on Amazon
                </a>

                <div class="engagement-bar">
                    <button class="action-btn" onclick="likeProduct(${p.id})">
                        <span class="heart-icon">❤️</span> 
                        <span id="likes-text-${p.id}">${displayLikes}</span> Likes
                    </button>
                    <button class="action-btn" onclick="toggleComments(${p.id})">
                        💬 Comments
                    </button>
                    <button class="action-btn" onclick="shareProduct(${p.id})">
                        🚀 Share
                    </button>
                </div>

                <div id="comments-box-${p.id}" class="comments-section">
                    <div id="list-${p.id}" class="comment-list"></div>
                    <form onsubmit="postComment(event, ${p.id})" class="comment-form">
                        <input type="text" placeholder="Likho hukum..." class="comment-input" required>
                        <button type="submit" style="background:var(--saffron); color:white; border:none; padding:5px 10px; border-radius:4px;">➤</button>
                    </form>
                </div>
            </div>
        </article>
        `;
    }).join('');
}

// 3. SEARCH
window.runSearch = () => {
    const term = document.getElementById('search-box').value.toLowerCase();
    const filtered = allProducts.filter(p => p.title.toLowerCase().includes(term));
    renderCards(filtered);
}

// --- ACTIONS ---

// LIKE (Smart Update: Asli aur Nakli likes ko mix nahi karega)
window.likeProduct = async (id) => {
    if (localStorage.getItem(`liked_${id}`)) {
        alert("Aap pehle hi like kar chuke hain sa!");
        return;
    }

    // 1. Screen par turant badha do (UI Trick)
    const el = document.getElementById(`likes-text-${id}`);
    let currentDisplay = parseInt(el.innerText);
    el.innerText = currentDisplay + 1;
    localStorage.setItem(`liked_${id}`, 'true');

    // 2. Database mein ASLI likes badhao (Fake nahi)
    // Pehle asli like count lao
    const { data } = await supabase.from('products').select('likes').eq('id', id).single();
    if(data) {
        const realLikes = data.likes + 1;
        await supabase.from('products').update({ likes: realLikes }).eq('id', id);
    }
};

// SHARE
window.shareProduct = (id) => {
    // Product dhoondo
    const product = allProducts.find(p => p.id === id);
    if(product && navigator.share) {
        navigator.share({
            title: product.title,
            text: `Check this royal deal: ${product.title}`,
            url: product.affiliate_url
        }).catch(console.error);
    } else {
        alert("Link copy ho gaya!");
    }
};

// COMMENTS TOGGLE
window.toggleComments = async (id) => {
    const box = document.getElementById(`comments-box-${id}`);
    box.classList.toggle('active');
    
    if (box.classList.contains('active')) {
        const list = document.getElementById(`list-${id}`);
        if(list.innerHTML === "") {
            list.innerHTML = "<small>Loading...</small>";
            const { data } = await supabase.from('comments').select('comment_text').eq('product_id', id);
            
            if (data && data.length > 0) {
                list.innerHTML = data.map(c => `<div class="comment-item">👤 ${c.comment_text}</div>`).join('');
            } else {
                list.innerHTML = "<div style='padding:5px; color:#666; font-size:0.8rem;'>Pehla comment aap karein!</div>";
            }
        }
    }
};

// POST COMMENT
window.postComment = async (e, id) => {
    e.preventDefault();
    const input = e.target.querySelector('input');
    const text = input.value;
    const list = document.getElementById(`list-${id}`);
    
    if(list.innerText.includes("Pehla") || list.innerText.includes("Loading")) list.innerHTML = "";

    list.innerHTML += `<div class="comment-item">👤 ${text}</div>`;
    input.value = "";

    await supabase.from('comments').insert([{ product_id: id, comment_text: text }]);
};

// VISITOR COUNTER
(async function countVisit() {
    const isAdmin = localStorage.getItem('hukum_logged_in');
    if (!isAdmin && !sessionStorage.getItem('visit_counted')) {
        await supabase.rpc('increment_views');
        sessionStorage.setItem('visit_counted', 'true');
    }
})();

// START
loadFeed();
