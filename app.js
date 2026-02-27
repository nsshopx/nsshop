import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// --- CONFIGURATION ---
const URL = 'https://ihxdiydlnzpncqdylsla.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloeGRpeWRsbnpwbmNxZHlsc2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5Njg0NDcsImV4cCI6MjA4NDU0NDQ0N30.BYj3iokkcNC88u_xrFRvbFnSdpqbLz_ZWP_zvNWfamc';
const supabase = createClient(URL, KEY);

// --- GLOBAL STATE ---
let allProducts = [];

// --- UTILITIES ---
// Advanced UI: Custom Toast Notification (Alert ki jagah)
const showToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.innerText = message;
    toast.style.cssText = `
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        background: ${type === 'error' ? '#ff4d4d' : '#333'}; color: #fff;
        padding: 10px 20px; border-radius: 5px; z-index: 1000; font-family: sans-serif;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: opacity 0.3s;
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
};

// --- CORE FUNCTIONS ---

// 1. LOAD FEED (With Strict Error Handling)
async function loadFeed() {
    const feed = document.getElementById('product-feed');
    feed.innerHTML = '<div class="loading-spinner"></div><p style="text-align:center;">Shahi Khazana Load ho raha hai...</p>';

    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        if (!data || data.length === 0) {
            feed.innerHTML = `<p style="text-align:center;">Abhi koi product available nahi hai.</p>`;
            return;
        }

        allProducts = data;
        renderCards(allProducts);
    } catch (err) {
        console.error("Supabase Fetch Error:", err);
        feed.innerHTML = `
            <div style="text-align:center; padding: 20px; color: #d9534f; border: 1px solid #d9534f; border-radius: 8px; margin: 10px;">
                <h4>⚠️ Network Ya Server Error</h4>
                <p>Browser Supabase server se connect nahi ho pa raha hai.</p>
                <p style="font-size: 12px; color: #666;">Tech Info: ${err.message}</p>
                <button onclick="location.reload()" style="padding: 8px 16px; margin-top: 10px; cursor: pointer;">Refresh Karein</button>
            </div>`;
    }
}

// 2. RENDER CARDS
function renderCards(products) {
    const feed = document.getElementById('product-feed');
    
    if (products.length === 0) {
        feed.innerHTML = "<p style='text-align:center'>Koi product nahi mila.</p>";
        return;
    }

    // Map through products safely
    feed.innerHTML = products.map(p => {
        // --- AUTO-LIKE LOGIC ---
        const uploadTime = new Date(p.created_at || Date.now());
        const hoursDiff = Math.abs(Date.now() - uploadTime.getTime()) / 36e5; 
        const effectiveHours = Math.min(hoursDiff, 240); // Max 10 Days
        const fakeLikes = Math.floor(effectiveHours * 1.5);
        const displayLikes = (p.likes || 0) + fakeLikes;

        return `
        <article class="product-card" id="card-${p.id}">
            <div class="img-frame">
                <img src="${p.image_url}" alt="${p.title}" class="product-img" loading="lazy" onerror="this.src='https://via.placeholder.com/400?text=Image+Not+Found'">
            </div>
            
            <div class="card-body">
                <h3 class="product-title">${p.title}</h3>
                
                <a href="${p.affiliate_url}" target="_blank" rel="noopener noreferrer" class="btn-amazon">
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

                <div id="comments-box-${p.id}" class="comments-section" style="display: none;">
                    <div id="list-${p.id}" class="comment-list" style="max-height: 150px; overflow-y: auto; margin-bottom: 10px;"></div>
                    <form onsubmit="postComment(event, ${p.id})" class="comment-form" style="display: flex; gap: 5px;">
                        <input type="text" placeholder="Likho hukum..." class="comment-input" required style="flex: 1; padding: 5px;">
                        <button type="submit" style="background:var(--saffron, #ff9933); color:white; border:none; padding:5px 15px; border-radius:4px; cursor: pointer;">➤</button>
                    </form>
                </div>
            </div>
        </article>
        `;
    }).join('');
}

// 3. OPTIMIZED SEARCH (Debounced to prevent lag)
let searchTimeout;
window.runSearch = () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const term = document.getElementById('search-box')?.value.toLowerCase() || "";
        const filtered = allProducts.filter(p => p.title.toLowerCase().includes(term));
        renderCards(filtered);
    }, 300); // 300ms delay so typing is smooth
};

// Custom event listener for search input if it exists
document.getElementById('search-box')?.addEventListener('input', window.runSearch);

// --- ACTIONS ---

// LIKE 
window.likeProduct = async (id) => {
    if (localStorage.getItem(`liked_${id}`)) {
        showToast("Aap pehle hi like kar chuke hain sa!", "error");
        return;
    }

    // Optimistic UI Update (Turant screen par badhao)
    const el = document.getElementById(`likes-text-${id}`);
    if (el) el.innerText = parseInt(el.innerText) + 1;
    localStorage.setItem(`liked_${id}`, 'true');

    // Background Database Update
    try {
        const { data, error } = await supabase.from('products').select('likes').eq('id', id).single();
        if (error) throw error;
        
        if (data) {
            await supabase.from('products').update({ likes: data.likes + 1 }).eq('id', id);
        }
    } catch (err) {
        console.error("Like update fail hua:", err);
        // Silently fail, user experience kharab na ho
    }
};

// SHARE
window.shareProduct = async (id) => {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    const shareData = {
        title: product.title,
        text: `Check this royal deal on NS Shop: ${product.title}`,
        url: product.affiliate_url
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(shareData.url);
            showToast("Link copy ho gaya!");
        }
    } catch (err) {
        console.error("Share error:", err);
    }
};

// COMMENTS TOGGLE
window.toggleComments = async (id) => {
    const box = document.getElementById(`comments-box-${id}`);
    const isHidden = box.style.display === 'none' || box.style.display === '';
    
    box.style.display = isHidden ? 'block' : 'none';
    
    if (isHidden) {
        const list = document.getElementById(`list-${id}`);
        if (list.innerHTML === "") {
            list.innerHTML = "<small style='color: gray;'>Loading comments...</small>";
            try {
                const { data, error } = await supabase.from('comments').select('comment_text').eq('product_id', id);
                if (error) throw error;

                if (data && data.length > 0) {
                    // XSS Protection: HTML entities ko escape kiya gaya hai
                    list.innerHTML = data.map(c => {
                        const safeText = document.createElement('div');
                        safeText.innerText = c.comment_text;
                        return `<div class="comment-item" style="padding: 4px; border-bottom: 1px solid #eee;">👤 ${safeText.innerHTML}</div>`;
                    }).join('');
                } else {
                    list.innerHTML = "<div style='padding:5px; color:#666; font-size:0.8rem;'>Pehla comment aap karein!</div>";
                }
            } catch (err) {
                list.innerHTML = "<small style='color: red;'>Comments load nahi ho paye.</small>";
            }
        }
    }
};

// POST COMMENT
window.postComment = async (e, id) => {
    e.preventDefault();
    const input = e.target.querySelector('input');
    const text = input.value.trim();
    if (!text) return;

    const list = document.getElementById(`list-${id}`);
    
    // UI Setup
    if(list.innerText.includes("Pehla") || list.innerText.includes("Loading") || list.innerText.includes("fail")) list.innerHTML = "";

    // Safely append to UI
    const tempDiv = document.createElement('div');
    tempDiv.innerText = text;
    list.innerHTML += `<div class="comment-item" style="padding: 4px; border-bottom: 1px solid #eee; background: #f9f9f9;">👤 ${tempDiv.innerHTML} <small>(Posting...)</small></div>`;
    input.value = "";

    try {
        const { error } = await supabase.from('comments').insert([{ product_id: id, comment_text: text }]);
        if (error) throw error;
        
        // Remove 'Posting...' text on success
        list.lastElementChild.innerHTML = `👤 ${tempDiv.innerHTML}`;
        showToast("Comment post ho gaya!");
    } catch (err) {
        console.error("Comment fail:", err);
        showToast("Comment post fail hua. Network check karein.", "error");
        list.lastElementChild.style.color = 'red';
        list.lastElementChild.innerHTML += " ❌";
    }
};

// VISITOR COUNTER
(async function countVisit() {
    try {
        const isAdmin = localStorage.getItem('hukum_logged_in');
        if (!isAdmin && !sessionStorage.getItem('visit_counted')) {
            const { error } = await supabase.rpc('increment_views');
            if (!error) sessionStorage.setItem('visit_counted', 'true');
        }
    } catch (err) {
        console.error("View counter fail:", err);
    }
})();

// --- INITIALIZE ---
document.addEventListener("DOMContentLoaded", loadFeed);
