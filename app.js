import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// --- API CONFIG ---
const URL = 'https://ihxdiydlnzpncqdylsla.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloeGRpeWRsbnpwbmNxZHlsc2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5Njg0NDcsImV4cCI6MjA4NDU0NDQ0N30.BYj3iokkcNC88u_xrFRvbFnSdpqbLz_ZWP_zvNWfamc';
const supabase = createClient(URL, KEY);

const feed = document.getElementById('product-feed');

// 1. LOAD FEED
async function loadFeed(searchTerm = '') {
    // Spinner sirf search karte waqt dikhayein, shuru mein nahi agar pehle se data hai
    if(searchTerm) feed.innerHTML = '<div class="loading-mandala">Searching...</div>';
    
    let query = supabase.from('products').select('*').order('created_at', { ascending: false });
    
    if (searchTerm) {
        query = query.ilike('title', `%${searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
        feed.innerHTML = `<p style="text-align:center;">Network Error.</p>`;
    } else if (!data || data.length === 0) {
        feed.innerHTML = `<p style="text-align:center;">Koi product nahi mila.</p>`;
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
                    <div id="list-${p.id}" class="comment-list"></div>
                    
                    <form onsubmit="postComment(event, ${p.id})" class="comment-form">
                        <input type="text" placeholder="Likho hukum..." class="comment-input" required>
                        <button type="submit" style="background:var(--saffron); color:white; border:none; padding:5px 10px; border-radius:4px;">➤</button>
                    </form>
                </div>
            </div>
        </article>
    `).join('');
}

// 3. SEARCH
window.runSearch = () => {
    const term = document.getElementById('search-box').value;
    loadFeed(term);
}
document.getElementById('search-box').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') runSearch();
});

// --- ACTIONS ---

// LIKE (Sirf 1 baar per user)
window.likeProduct = async (id) => {
    // Check karein kya user pehle like kar chuka hai?
    if (localStorage.getItem(`liked_${id}`)) {
        alert("Aap pehle hi like kar chuke hain sa!");
        return;
    }

    const el = document.getElementById(`likes-${id}`);
    let current = parseInt(el.innerText);
    
    // UI Update
    el.innerText = current + 1;
    
    // Browser mein save karein taaki dobara like na kar sake
    localStorage.setItem(`liked_${id}`, 'true');

    // DB Update
    await supabase.from('products').update({ likes: current + 1 }).eq('id', id);
};

// SHARE
window.shareProduct = (id) => {
    const link = `${window.location.origin}${window.location.pathname}?id=${id}`;
    navigator.clipboard.writeText(link);
    alert("Link Copy ho gaya!\n" + link);
};

// COMMENTS TOGGLE
window.toggleComments = async (id) => {
    const box = document.getElementById(`comments-box-${id}`);
    box.classList.toggle('active');
    
    // Sirf jab box khule tabhi data layein
    if (box.classList.contains('active')) {
        const list = document.getElementById(`list-${id}`);
        
        // Agar pehle se load nahi kiya hai to hi load karein
        if(list.innerHTML === "") {
            list.innerHTML = "<small style='color:#888'>Loading...</small>"; // Chhota sa loading indicator
            
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
    
    // Agar "Pehla comment" likha hai to hata do
    if(list.innerText.includes("Pehla")) list.innerHTML = "";
    if(list.innerText.includes("Loading")) list.innerHTML = "";

    // Turant UI mein dikhayein
    list.innerHTML += `<div class="comment-item">👤 ${text}</div>`;
    input.value = "";

    // DB mein bhejein
    await supabase.from('comments').insert([{ product_id: id, comment_text: text }]);
};

// INIT
loadFeed();
// --- VISITOR COUNTER ---
// Jaise hi page load ho, ginti badha do
(async function countVisit() {
    // Check karein ki ye Admin to nahi hai? (Admin ko count mat karo)
    const isAdmin = localStorage.getItem('hukum_logged_in');
    
    // Agar banda Admin nahi hai, aur pehle count nahi kiya hai session mein
    if (!isAdmin && !sessionStorage.getItem('visit_counted')) {
        await supabase.rpc('increment_views'); // Database function call kiya
        sessionStorage.setItem('visit_counted', 'true'); // Browser ko bata do ki iska count ho gaya
    }
})();
