// --- IMPORT SUPABASE (DO NOT CHANGE) ---
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// --- CONFIGURATION (Tumhari Credentials) ---
const SUPABASE_URL = 'https://ihxdiydlnzpncqdylsla.supabase.co';
const SUPABASE_KEY = 'Sb_publishable_lOpan6CsYv4S4HDu4tZ-bA_nJUPKTdl';

// Init Database
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- DOM ELEMENTS ---
const grid = document.getElementById('product-grid');
const searchInput = document.getElementById('search-input');
const modal = document.getElementById('sell-modal');
const form = document.getElementById('add-product-form');
const toastBox = document.getElementById('toast-box');

// --- 1. CORE: FETCH & SEARCH PRODUCTS ---
async function fetchProducts(searchQuery = '') {
    // Show Loading Skeleton
    if (!searchQuery) showSkeleton();

    let query = supabase
        .from('products')
        .select('*')
        .order('id', { ascending: false });

    // Agar search box mein kuch likha hai, to filter karo
    if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Fetch Error:", error);
        showToast("Failed to load products", "error");
        return;
    }

    renderProducts(data);
}

// --- 2. RENDER LOGIC (With TimeAgo & Formatter) ---
function renderProducts(products) {
    if (!products || products.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">
                <h3>No gadgets found 😕</h3>
                <p>Try searching for something else or sell your own!</p>
            </div>`;
        return;
    }

    grid.innerHTML = products.map(item => {
        // Price Formatting (₹45,000)
        const formattedPrice = new Intl.NumberFormat('en-IN', {
            style: 'currency', currency: 'INR', maximumFractionDigits: 0
        }).format(item.price.replace(/,/g, '')); // Remove commas if stored as string

        // Time Ago Logic
        const timeString = getTimeAgo(item.created_at);

        // Fallback Image
        const img = item.image_url && item.image_url.startsWith('http') 
            ? item.image_url 
            : `https://source.unsplash.com/400x300/?tech,gadget&sig=${item.id}`;

        return `
            <article class="card">
                <div class="card-img-wrap">
                    <img src="${img}" class="card-img" loading="lazy" alt="${item.title}">
                </div>
                <div class="card-body">
                    <span class="card-price">${formattedPrice}</span>
                    <h3 class="card-title">${item.title}</h3>
                    
                    <div class="card-footer">
                        <span class="card-loc">📍 ${item.location}</span>
                        <span class="card-time">🕒 ${timeString}</span>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

// --- 3. ADD PRODUCT (Advanced) ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('.btn-submit');
    const originalText = btn.innerText;
    
    // UI Loading State
    btn.innerText = "Publishing...";
    btn.style.opacity = "0.7";
    btn.disabled = true;

    const newProduct = {
        title: document.getElementById('inp-title').value,
        price: document.getElementById('inp-price').value,
        location: document.getElementById('inp-location').value,
        seller_name: document.getElementById('inp-seller').value,
        image_url: document.getElementById('inp-image').value,
        rating: 5,
        created_at: new Date().toISOString() // Save current time
    };

    const { error } = await supabase.from('products').insert([newProduct]);

    if (error) {
        showToast("Error: " + error.message, "error");
    } else {
        showToast("Success! Your ad is live 🚀", "success");
        form.reset();
        toggleModal(false);
        fetchProducts(); // Refresh Grid
    }

    // Reset Button
    btn.innerText = originalText;
    btn.style.opacity = "1";
    btn.disabled = false;
});

// --- 4. UTILITIES (Helpers) ---

// Real-time Search Listener
searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        fetchProducts(e.target.value);
    }
});
document.getElementById('search-btn').addEventListener('click', () => {
    fetchProducts(searchInput.value);
});

// Toast Notification System
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${message}`;
    toastBox.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Time Ago Formatter (e.g. "2 hours ago")
function getTimeAgo(dateString) {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " mins ago";
    return "Just now";
}

// Loading Animation
function showSkeleton() {
    grid.innerHTML = Array(4).fill(0).map(() => `
        <div class="card" style="pointer-events:none;">
            <div style="height:200px; background:#e5e7eb; animation:pulse 1.5s infinite;"></div>
            <div style="padding:15px;">
                <div style="height:20px; width:60%; background:#e5e7eb; margin-bottom:10px;"></div>
                <div style="height:15px; width:40%; background:#e5e7eb;"></div>
            </div>
        </div>
    `).join('');
}

// Modal Toggle
function toggleModal(show) {
    modal.classList.toggle('active', show);
}
document.getElementById('btn-sell-trigger').addEventListener('click', () => toggleModal(true));
document.getElementById('btn-close-modal').addEventListener('click', () => toggleModal(false));
window.addEventListener('click', (e) => { if (e.target === modal) toggleModal(false); });

// --- INIT ---
fetchProducts();

