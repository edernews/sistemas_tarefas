const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const btnText = document.getElementById('btn-text');
const toggleAuth = document.getElementById('toggle-auth');
const toggleText = document.getElementById('toggle-text');
const errorMessage = document.getElementById('error-message');

let isLogin = true;

// Check if user is already logged in
async function checkUser() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        window.location.href = 'index.html';
    }
}

checkUser();

toggleAuth.addEventListener('click', (e) => {
    e.preventDefault();
    isLogin = !isLogin;
    
    if (isLogin) {
        authTitle.textContent = 'Entre para gerenciar suas tarefas';
        btnText.textContent = 'Entrar';
        toggleText.textContent = 'Não tem uma conta?';
        toggleAuth.textContent = 'Criar conta';
    } else {
        authTitle.textContent = 'Crie sua conta no TaskMaster';
        btnText.textContent = 'Cadastrar';
        toggleText.textContent = 'Já tem uma conta?';
        toggleAuth.textContent = 'Fazer Login';
    }
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    errorMessage.style.display = 'none';
    
    try {
        if (isLogin) {
            const { error } = await supabaseClient.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.auth.signUp({
                email,
                password,
            });
            if (error) throw error;
            alert('Cadastro realizado! Verifique seu e-mail (se habilitado no Supabase) ou tente fazer login.');
            isLogin = true;
            toggleAuth.click();
            return;
        }
        
        window.location.href = 'index.html';
    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    }
});
