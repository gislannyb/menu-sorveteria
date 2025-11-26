let carrinho = [];

// Se quiser enviar direto para um número específico, coloque o número aqui no formato
// '55<ddd><numero>' (ex: '5511999999999' para um número de SP). Deixe vazio para usar o QR.
const WHATSAPP_PHONE = ''; // <--- coloque o número aqui se desejar envio direto

// Função para ocultar splash screen
function hideSplashScreen() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        setTimeout(() => {
            splash.classList.add('hidden');
            splash.style.display = 'none';
        }, 2400);
    }
}

// Executar ao carregar página
document.addEventListener('DOMContentLoaded', () => {
    hideSplashScreen();
    loadCarrinho();
    renderizarCarrinho();
});

// Função para scroll suave (mobile-friendly)
function scrollToElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Alias para compatibilidade — rola até a seção do carrinho e foca o campo de nome
function scrollToCart() {
    // tenta selecionar pela classe '.carrinho', depois '#pedido' como fallback
    let cartSection = document.querySelector('.carrinho') || document.getElementById('pedido');
    if (cartSection) {
        cartSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        // fallback genérico
        scrollToElement('main');
    }
    const nomeInput = document.getElementById('nomeCliente');
    if (nomeInput) {
        // foco com leve atraso para permitir o scroll terminar em alguns navegadores
        setTimeout(() => nomeInput.focus(), 500);
    }

    // Oculta temporariamente os botões flutuantes para evitar sobreposição
    const cartBtn = document.querySelector('.cart-btn-header') || document.getElementById('cart-button');
    const helpBtn = document.querySelector('.help-btn-header') || document.getElementById('help-button');
    [cartBtn, helpBtn].forEach(el => { if (el) el.classList.add('floating-hidden'); });
    // Reexibe após o scroll/entrada da seção (1.2s)
    setTimeout(() => { [cartBtn, helpBtn].forEach(el => { if (el) el.classList.remove('floating-hidden'); }); }, 1200);
}

function adicionarAoCarrinho(sabor, preco, tamanhoLabel, basePrice) {
    // adiciona item considerando tamanho (tamanhoLabel) e preço já calculado
    const existente = carrinho.find(i => i.sabor === sabor && i.tamanho === tamanhoLabel);
    if (existente) {
        existente.qtd += 1;
    } else {
        carrinho.push({ sabor, preco, qtd: 1, tamanho: tamanhoLabel, basePrice: basePrice });
    }
    renderizarCarrinho();
    showToast(`${sabor} (${tamanhoLabel}) adicionado ao carrinho`);
    // Adiciona feedback tátil
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

// helper usado pelos botões no HTML: recebe o botão (this), o sabor e o preço base (250ml)
function adicionarAoCarrinhoFrom(btn, sabor, basePrice) {
    const wrapper = btn.closest('.item');
    if (!wrapper) return;
    const select = wrapper.querySelector('.size-select');
    let multiplier = 1;
    let tamanhoLabel = '250ml';
    if (select) {
        multiplier = parseFloat(select.value) || 1;
        tamanhoLabel = select.options[select.selectedIndex].dataset.label || select.options[select.selectedIndex].text;
    }
    const preco = +(basePrice * multiplier).toFixed(2);
    adicionarAoCarrinho(sabor, preco, tamanhoLabel, basePrice);
}

// Função para mostrar toast (mensagem curta) ao usuário
function showToast(text, duration = 3000) {
    const container = document.getElementById('toast');
    if (!container) return;
    const item = document.createElement('div');
    item.className = 'toast-item';
    item.textContent = text;
    container.appendChild(item);
    // forçar reflow para ativar transição
    void item.offsetWidth;
    item.classList.add('show');

    // remove após duração
    setTimeout(() => {
        item.classList.remove('show');
        setTimeout(() => container.removeChild(item), 220);
    }, duration);
}

function incrementar(key) {
    // key formato 'Sabor||Tamanho'
    const [sabor, tamanho] = key.split('||');
    const item = carrinho.find(i => i.sabor === sabor && i.tamanho === tamanho);
    if (item) {
        item.qtd += 1;
        renderizarCarrinho();
    }
}

function decrementar(key) {
    const [sabor, tamanho] = key.split('||');
    const item = carrinho.find(i => i.sabor === sabor && i.tamanho === tamanho);
    if (item) {
        item.qtd -= 1;
        if (item.qtd <= 0) {
            removerPorSabor(key);
        } else {
            renderizarCarrinho();
        }
    }
}

function removerPorSabor(key) {
    const [sabor, tamanho] = key.split('||');
    carrinho = carrinho.filter(i => !(i.sabor === sabor && i.tamanho === tamanho));
    console.log('Item removido. Carrinho agora:', carrinho);
    renderizarCarrinho();
    updateCartCount();
    saveCarrinho();
}

function limparCarrinho() {
    carrinho = [];
    console.log('Carrinho limpo completamente');
    renderizarCarrinho();
    updateCartCount();
    saveCarrinho();
}

function limparTudo() {
    // Limpa carrinho em memória e no localStorage
    carrinho = [];
    localStorage.removeItem('bomsabor_carrinho');
    localStorage.removeItem('bomsabor_nome');
    localStorage.removeItem('bomsabor_telefone');
    renderizarCarrinho();
    alert('Carrinho e dados salvos foram completamente limpos.');
}

function renderizarCarrinho() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('total');
    container.innerHTML = '';

    if (carrinho.length === 0) {
        container.innerHTML = '<p class="empty">Seu carrinho está vazio.</p>';
        totalEl.textContent = 'Total: R$ 0,00';
        return;
    }

    let total = 0;
    carrinho.forEach(item => {
        const subtotal = item.qtd * item.preco;
        total += subtotal;

        const div = document.createElement('div');
        div.className = 'cart-line';
        const key = `${item.sabor}||${item.tamanho}`;
        div.innerHTML = `
            <div class="info">
                <div class="name">${item.sabor} <span class="tamanho">(${item.tamanho})</span></div>
                <div class="price">R$ ${item.preco.toFixed(2).replace('.', ',')} cada</div>
            </div>
            <div class="controls">
                <div class="qty-controls">
                    <button class="qty-btn" onclick="decrementar('${item.sabor}||${item.tamanho}')">-</button>
                    <span class="qty">${item.qtd}</span>
                    <button class="qty-btn" onclick="incrementar('${item.sabor}||${item.tamanho}')">+</button>
                </div>
                <button class="remove-btn" onclick="removerPorSabor('${item.sabor}||${item.tamanho}')">Remover</button>
            </div>
        `;
        container.appendChild(div);
    });

    totalEl.textContent = `Total: R$ ${total.toFixed(2).replace('.', ',')}`;
    updateCartCount();
    // persiste o estado do carrinho no localStorage sempre que renderizamos
    saveCarrinho();
}

function saveCarrinho() {
    try {
        // Salva apenas itens válidos
        const validCarrinho = carrinho.filter(item => {
            return item.sabor && typeof item.preco === 'number' && item.qtd > 0 && item.tamanho;
        });
        localStorage.setItem('bomsabor_carrinho', JSON.stringify(validCarrinho));
        console.log('Carrinho salvo:', validCarrinho);
    } catch (e) {
        console.warn('Erro ao salvar carrinho', e);
    }
}

function loadCarrinho() {
    try {
        const raw = localStorage.getItem('bomsabor_carrinho');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                // Valida cada item
                carrinho = parsed.filter(item => {
                    return item.sabor && typeof item.preco === 'number' && item.qtd > 0 && item.tamanho;
                });
                console.log('Carrinho restaurado:', carrinho);
            }
        }
    } catch (e) {
        console.warn('Erro ao carregar carrinho', e);
        carrinho = [];
    }
}

function enviarParaWhatsApp() {
    const nome = document.getElementById('nomeCliente').value.trim();
    const telefone = document.getElementById('telefoneCliente').value.trim();
    const endereco = document.getElementById('enderecoCliente').value.trim();

    if (carrinho.length === 0) {
        alert('Seu carrinho está vazio. Adicione pelo menos um item antes de enviar.');
        return;
    }

    if (!nome) {
        alert('Por favor, preencha seu nome.');
        return;
    }

    if (!endereco) {
        alert('Por favor, preencha o endereço (obrigatório).');
        return;
    }

    let linhas = [];
    let total = 0;
    carrinho.forEach(i => {
        const subtotal = i.qtd * i.preco;
        total += subtotal;
        linhas.push(`${i.qtd}x ${i.sabor} (${i.tamanho}) — R$ ${subtotal.toFixed(2).replace('.', ',')}`);
    });

    let mensagem = '';
    if (nome) mensagem += `*Nome:* ${nome}\n`;
    if (telefone) mensagem += `*Telefone:* ${telefone}\n`;
    if (endereco) mensagem += `*Endereço:* ${endereco}\n`;
    mensagem += `*Pedido:*\n` + linhas.join('\n') + `\n*Total:* R$ ${total.toFixed(2).replace('.', ',')}`;

    const encoded = encodeURIComponent(mensagem);
    if (WHATSAPP_PHONE && WHATSAPP_PHONE.trim() !== '') {
        const url = `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encoded}`;
        window.open(url, '_blank');
        return;
    }

    const whatsappQR = 'https://wa.me/qr/2F2ORF5CAI3SB1';
    const url = `${whatsappQR}?text=${encoded}`;
    window.open(url, '_blank');
}

function updateCartCount() {
    const countEl = document.getElementById('cart-count');
    if (!countEl) return;
    const totalQtd = carrinho.reduce((s, i) => s + (i.qtd || 0), 0);
    countEl.textContent = totalQtd;
}

// Alias para compatibilidade (com foco no input)
function scrollToCartLegacy() {
    const cartSection = document.querySelector('.carrinho');
    if (!cartSection) return;
    cartSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // pequenos ajustes: foca no input de nome para facilitar envio
    const nomeInput = document.getElementById('nomeCliente');
    if (nomeInput) nomeInput.focus();
}

function toggleInstrucoes() {
    const panel = document.getElementById('instrucoes-panel');
    const btn = document.getElementById('help-button');
    if (!panel || !btn) return;
    const isHidden = panel.classList.contains('hidden');
    if (isHidden) {
        panel.classList.remove('hidden');
        btn.setAttribute('aria-expanded', 'true');
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        panel.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');
    }
}
