import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// --- API CONFIG ---
const URL = 'https://ihxdiydlnzpncqdylsla.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloeGRpeWRsbnpwbmNxZHlsc2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5Njg0NDcsImV4cCI6MjA4NDU0NDQ0N30.BYj3iokkcNC88u_xrFRvbFnSdpqbLz_ZWP_zvNWfamc';
const supabase = createClient(URL, KEY);

const feed = document.getElementById('product-feed');

// 1. MAIN LOAD FUNCTION
async function loadFeed() {
    // Check URL agar kisi specific product ka link hai (?id=123)
    const urlParams = new URLSearchParams(window.location.search);
    const specificId = urlParams.get('id');

    let query = supabase.from('products').select('*').order('created_at', { ascending: false });
    
    // Agar link mein ID hai, to sirf wahi product dikhao
    if (specificId) {
        query = supabase.from('products').select('*').eq('id', specificId);
    }

    const { data, error } = await query;

    if (error) {
        console.error(error);
        feed.innerHTML = `<p style="text-align:center;">Network Error. Refresh karein.</p>`;
    } else if (data.length === 0) {
        feed.innerHTML = `<p style="text-align:center;">Abhi koi product nahi hai.</p>`;
    } else {
        renderCards(data);
    }
}

// 2. RENDER CARDS
function renderCards(products) {
    feed.innerHTML = products.map(p => `
        <article class="product-card" id="card-${p.id}">
            <div class="img-frame">
                <img src="${p.image_url}" alt="Product" class="product-img" onerror="this.src='https://via.placeholder.com/400'">
            </div>
            
            <div class="card-body">
                <h3 class="product-title">${p.title}</h3>
                
                <a href="${p.affiliate_url}" target="_blank" rel="nofollow noopener noreferrer" class="btn-amazon">
                    🛒 Buy on Amazon
                </a>

                <div class="engagement-bar">
                    <button class="action-btn" onclick="likeProduct(${p.id})">
                        <span class="heart-icon">❤️</span> <span id="likes-${p.id}">${p.likes}</span> Likes
                    </button>
                    <button class="action-btn" onclick="toggleComments(${p.id})">
                        💬 Comments
                    </button>
                    <button class="action-btn" onclick="shareProduct(${p.id})">
                        🚀 Share
                    </button>
                </div>

                <div id="comments-box-${p.id}" class="comments-section">
                    <div id="list-${p.id}" class="comment-list">Loading comments...</div>
                    <form onsubmit="postComment(event, ${p.id})" class="comment-form">
                        <input type="text" placeholder="Likho hukum..." class="comment-input" required>
                        <button type="submit" style="background:var(--saffron); color:white; border:none; padding:5px 10px; border-radius:4px;">➤</button>
                    </form>
                </div>
            </div>
        </article>
    `).join('');
}

// 3. GLOBAL FUNCTIONS (Window se attach)

// LIKE FUNCTION
window.likeProduct = async (id) => {
    const el = document.getElementById(`likes-${id}`);
    let current = parseInt(el.innerText);
    // UI Update Turant
    el.innerText = current + 1;
    
    // DB Update
    await supabase.from('products').update({ likes: current + 1 }).eq('id', id);
};

// SHARE FUNCTION (Direct Link)
window.shareProduct = (id) => {
    const link = `${window.location.origin}${window.location.pathname}?id=${id}`;
    navigator.clipboard.writeText(link);
    alert("Link Copy ho gaya! Ab WhatsApp/Insta par share karein.\n" + link);
};

// TOGGLE COMMENTS
window.toggleComments = async (id) => {
    const box = document.getElementById(`comments-box-${id}`);
    box.classList.toggle('active');
    
    if (box.classList.contains('active')) {
        const list = document.getElementById(`list-${id}`);
        const { data } = await supabase.from('comments').select('comment_text').eq('product_id', id);
        
        list.innerHTML = data && data.length ? 
            data.map(c => `<div class="comment-item">👤 ${c.comment_text}</div>`).join('') : 
            "Pehla comment aap karein!";
    }
};

// POST COMMENT
window.postComment = async (e, id) => {
    e.preventDefault();
    const input = e.target.querySelector('input');
    const text = input.value;
    
    // Optimistic UI
    const list = document.getElementById(`list-${id}`);
    if(list.innerText === "Pehla comment aap karein!") list.innerHTML = "";
    list.innerHTML += `<div class="comment-item">👤 ${text}</div>`;
    input.value = "";

    await supabase.from('comments').insert([{ product_id: id, comment_text: text }]);
};

// START
loadFeed();

