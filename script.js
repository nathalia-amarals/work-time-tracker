// TimeTracker - Versão Simplificada e Funcional
class TimeTracker {
    constructor() {
        this.records = JSON.parse(localStorage.getItem('timeRecords')) || [];
        this.currentJustification = null;
        this.settings = this.loadSettings();
        
        // Variáveis de paginação
        this.currentPage = 1;
        this.recordsPerPage = 10; // 10 dias por página
        this.totalPages = 1;
        this.totalRecords = 0;
        
        // Detectar idioma e locale do sistema
        this.systemLocale = navigator.language || navigator.userLanguage || 'pt-BR';
        this.systemTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Usar timezone configurado ou o do sistema
        this.effectiveTimeZone = this.settings.timeZone || this.systemTimeZone;
        this.timeZone = this.effectiveTimeZone;
        
        console.log(`🌍 Locale detectado: ${this.systemLocale}`);
        console.log(`🕐 Fuso horário do sistema: ${this.systemTimeZone}`);
        console.log(`🕐 Fuso horário efetivo: ${this.effectiveTimeZone}`);

        this.init();
    }

    init() {
        console.log('🚀 Inicializando TimeTracker...');
        this.setupEventListeners();
        this.updateCurrentTime();
        this.loadTimeRecords();
        this.updateUI();
        
        // Atualizar relógio e tempo de trabalho a cada 5 minutos
        setInterval(() => {
            this.updateCurrentTime();
            // Atualizar tempo de trabalho em tempo real se estiver trabalhando
            const today = this.formatDate(new Date());
            const todayRecords = this.records.filter(record => record.date === today);
            this.updateCurrentWorkTime(todayRecords);
        }, 300000); // 5 minutos = 300000 milissegundos

        console.log('✅ TimeTracker inicializado!');
    }

    loadSettings() {
        const stored = localStorage.getItem('timeTrackerSettings');
        const base = { dailyHours: 8, weeklyHours: 40, holidays: [], showJustificationPopup: true, timeZone: null };
        if (!stored) return base;
        try {
            const parsed = JSON.parse(stored);
            return { ...base, ...parsed };
        } catch {
            console.error('Erro ao carregar configurações, usando padrão:', e);
            return base;
        }
    }

    saveSettings() {
        localStorage.setItem('timeTrackerSettings', JSON.stringify(this.settings));
    }

    setupEventListeners() {
        // Função auxiliar para adicionar event listener com verificação
        const addListener = (id, event, handler) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, handler);
            }
        };
        
        // Botões principais
        addListener('btnStart', 'click', () => {
            this.registerTime('start');
        });
        
        addListener('btnBreak', 'click', () => {
            this.registerTime('break_start');
        });
        
        addListener('btnReturn', 'click', () => {
            this.registerTime('break_end');
        });
        
        addListener('btnEnd', 'click', () => {
            this.registerTime('end');
        });

        // Botões de exportar/importar
        addListener('btnExport', 'click', () => {
            this.exportData();
        });
        
        addListener('btnImport', 'click', () => {
            const fileInput = document.getElementById('fileInput');
            if (fileInput) fileInput.click();
        });

        // Modal - Verificar IDs corretos
        addListener('btnCancelJustification', 'click', () => {
            this.closeModal();
        });
        
        addListener('btnSaveJustification', 'click', () => {
            this.saveJustification();
        });

        // Filtro
        addListener('periodFilter', 'change', () => {
            this.loadTimeRecords();
        });

        // File input
        addListener('fileInput', 'change', (e) => {
            this.handleFileImport(e);
        });

        // Fechar modal clicando fora
        const justificationModal = document.getElementById('justificationModal');
        if (justificationModal) {
            justificationModal.addEventListener('click', (e) => {
                if (e.target.id === 'justificationModal') {
                    this.closeModal();
                }
            });
        }

        // Controle de horário manual
        const manualToggle = document.getElementById('manualTimeToggle');
        const manualInput = document.getElementById('manualTimeInput');
        if (manualToggle && manualInput) {
            manualToggle.addEventListener('change', () => {
                manualInput.disabled = !manualToggle.checked;
                if (!manualToggle.checked) {
                    manualInput.value = '';
                }
            });
        }

        addListener('btnSaveSettings', 'click', () => {
            this.updateSettingsFromForm();
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal) settingsModal.classList.remove('show');
        });

        addListener('btnOpenSettings', 'click', () => {
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal) {
                settingsModal.classList.add('show');
            }
        });

        addListener('btnSettingsCancel', 'click', () => {
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal) settingsModal.classList.remove('show');
        });

        // Event listeners para paginação
        addListener('btnFirstPage', 'click', () => {
            this.goToFirstPage();
        });
        
        addListener('btnPrevPage', 'click', () => {
            this.goToPrevPage();
        });
        
        addListener('btnNextPage', 'click', () => {
            this.goToNextPage();
        });
        
        addListener('btnLastPage', 'click', () => {
            this.goToLastPage();
        });

        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target.id === 'settingsModal') {
                    settingsModal.classList.remove('show');
                }
            });
        }

        this.populateSettingsForm();
    }

    populateSettingsForm() {
        const dailyInput = document.getElementById('dailyHours');
        const weeklyInput = document.getElementById('weeklyHours');
        const holidaysInput = document.getElementById('holidaysInput');
        const showJustificationInput = document.getElementById('showJustificationPopup');
        const timezoneSelect = document.getElementById('timezoneSelect');

        // Carregar timezones disponíveis
        this.populateTimezoneSelect();

        if (dailyInput) {
            dailyInput.value = this.settings.dailyHours;
        }
        if (weeklyInput) {
            weeklyInput.value = this.settings.weeklyHours;
        }
        if (holidaysInput) {
            holidaysInput.value = (this.settings.holidays || []).join('\n');
        }
        if (showJustificationInput) {
            showJustificationInput.checked = this.settings.showJustificationPopup;
        }
        if (timezoneSelect) {
            timezoneSelect.value = this.settings.timeZone || '';
        }
    }

    populateTimezoneSelect() {
        const timezoneSelect = document.getElementById('timezoneSelect');
        if (!timezoneSelect) return;

        // Principais fusos horários do mundo
        const commonTimezones = [
            { value: '', label: 'Usar fuso do sistema' },
            
            // América
            { value: 'America/New_York', label: 'Nova York (UTC-5/-4)' },
            { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8/-7)' },
            { value: 'America/Chicago', label: 'Chicago (UTC-6/-5)' },
            { value: 'America/Denver', label: 'Denver (UTC-7/-6)' },
            { value: 'America/Mexico_City', label: 'Cidade do México (UTC-6/-5)' },
            { value: 'America/Toronto', label: 'Toronto (UTC-5/-4)' },
            { value: 'America/Vancouver', label: 'Vancouver (UTC-8/-7)' },
            { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (UTC-3)' },
            { value: 'America/Santiago', label: 'Santiago (UTC-4/-3)' },
            { value: 'America/Lima', label: 'Lima (UTC-5)' },
            { value: 'America/Bogota', label: 'Bogotá (UTC-5)' },
            { value: 'America/Caracas', label: 'Caracas (UTC-4)' },
            
            // Brasil
            { value: 'America/Sao_Paulo', label: 'São Paulo (UTC-3)' },
            { value: 'America/Noronha', label: 'Fernando de Noronha (UTC-2)' },
            { value: 'America/Manaus', label: 'Manaus (UTC-4)' },
            { value: 'America/Rio_Branco', label: 'Rio Branco (UTC-5)' },
            
            // Europa
            { value: 'Europe/London', label: 'Londres (UTC+0/+1)' },
            { value: 'Europe/Paris', label: 'Paris (UTC+1/+2)' },
            { value: 'Europe/Berlin', label: 'Berlim (UTC+1/+2)' },
            { value: 'Europe/Rome', label: 'Roma (UTC+1/+2)' },
            { value: 'Europe/Madrid', label: 'Madri (UTC+1/+2)' },
            { value: 'Europe/Amsterdam', label: 'Amsterdã (UTC+1/+2)' },
            { value: 'Europe/Stockholm', label: 'Estocolmo (UTC+1/+2)' },
            { value: 'Europe/Moscow', label: 'Moscou (UTC+3)' },
            { value: 'Europe/Istanbul', label: 'Istambul (UTC+3)' },
            { value: 'Europe/Athens', label: 'Atenas (UTC+2/+3)' },
            
            // Ásia
            { value: 'Asia/Tokyo', label: 'Tóquio (UTC+9)' },
            { value: 'Asia/Shanghai', label: 'Xangai (UTC+8)' },
            { value: 'Asia/Hong_Kong', label: 'Hong Kong (UTC+8)' },
            { value: 'Asia/Singapore', label: 'Cingapura (UTC+8)' },
            { value: 'Asia/Seoul', label: 'Seul (UTC+9)' },
            { value: 'Asia/Bangkok', label: 'Bangcoc (UTC+7)' },
            { value: 'Asia/Jakarta', label: 'Jacarta (UTC+7)' },
            { value: 'Asia/Manila', label: 'Manila (UTC+8)' },
            { value: 'Asia/Kolkata', label: 'Nova Delhi (UTC+5:30)' },
            { value: 'Asia/Dubai', label: 'Dubai (UTC+4)' },
            
            // África
            { value: 'Africa/Cairo', label: 'Cairo (UTC+2)' },
            { value: 'Africa/Lagos', label: 'Lagos (UTC+1)' },
            { value: 'Africa/Johannesburg', label: 'Joanesburgo (UTC+2)' },
            { value: 'Africa/Casablanca', label: 'Casablanca (UTC+0/+1)' },
            
            // Oceania
            { value: 'Australia/Sydney', label: 'Sydney (UTC+10/+11)' },
            { value: 'Australia/Melbourne', label: 'Melbourne (UTC+10/+11)' },
            { value: 'Australia/Perth', label: 'Perth (UTC+8)' },
            { value: 'Pacific/Auckland', label: 'Auckland (UTC+12/+13)' },
            
            // Outros importantes
            { value: 'UTC', label: 'UTC (Temporal Universal Coordenado)' },
            { value: 'Asia/Kolkata', label: 'Índia (UTC+5:30)' },
            { value: 'Asia/Tehran', label: 'Teerã (UTC+3:30/+4:30)' }
        ];

        // Limpar opções existentes (exceto a primeira)
        timezoneSelect.innerHTML = '';
        
        // Adicionar opções
        commonTimezones.forEach(tz => {
            const option = document.createElement('option');
            option.value = tz.value;
            option.textContent = tz.label;
            timezoneSelect.appendChild(option);
        });
    }

    getEffectiveTime() {
        const now = new Date();
        const manualToggle = document.getElementById('manualTimeToggle');
        const manualInput = document.getElementById('manualTimeInput');

        if (manualToggle && manualInput && manualToggle.checked && manualInput.value) {
            // manualInput.value formato HH:MM
            const [hours, minutes] = manualInput.value.split(':').map(Number);
            const manualDate = new Date(now);
            manualDate.setHours(hours, minutes, 0, 0);
            return manualDate;
        }

        return now;
    }

    registerTime(type) {
        try {
            console.log(`⏰ Registrando: ${type}`);
            
            const effectiveDate = this.getEffectiveTime();
            if (!(effectiveDate instanceof Date) || isNaN(effectiveDate.getTime())) {
                throw new Error('Data/horário inválido');
            }
            
            const today = this.formatDate(effectiveDate);
            
            // Validação básica de tipo
            const validTypes = ['start', 'break_start', 'break_end', 'end'];
            if (!validTypes.includes(type)) {
                throw new Error(`Tipo de registro inválido: ${type}`);
            }
            
            const record = {
                id: Date.now() + Math.floor(Math.random() * 1000), // ID mais único
                type: type,
                timestamp: effectiveDate.toISOString(),
                date: today,
                time: effectiveDate.toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false,
                    timeZone: this.timeZone
                }),
                justification: null
            };
            
            // Validação de consistência
            this.validateRecordConsistency(record);

        console.log('📝 Registro criado:', record);
            
            // Salva o registro
            this.saveRecord(record);
            
            // Atualizar estados dos botões
            const todayRecords = this.records.filter(record => record.date === today);
            this.updateButtonStates(todayRecords);
            
            // Feedback visual
            this.showNotification(`Registro de ${type} salvo com sucesso!`, 'success');
            
            // Verifica preferência atual do checkbox na tela
            const showPopupCheckbox = document.getElementById('showJustificationPopup');
            const shouldShowPopup = showPopupCheckbox
                ? showPopupCheckbox.checked
                : this.settings.showJustificationPopup;

            // Se o horário exigir justificativa e o usuário permitir, sugere via pop-up (opcional)
            if (this.needsJustification(effectiveDate) && shouldShowPopup) {
                console.log('📋 Horário especial: justificativa opcional');
                this.currentJustification = { record, type: 'new' };
                this.openJustificationModal();
            }
            
        } catch (error) {
            console.error('❌ Erro ao registrar ponto:', error);
            this.showNotification(`Erro: ${error.message}`, 'error');
        }
    }

    updateSettingsFromForm() {
        const dailyInput = document.getElementById('dailyHours');
        const weeklyInput = document.getElementById('weeklyHours');
        const holidaysInput = document.getElementById('holidaysInput');
        const showJustificationInput = document.getElementById('showJustificationPopup');

        if (dailyInput) {
            const daily = parseFloat(dailyInput.value);
            if (!isNaN(daily) && daily > 0) {
                this.settings.dailyHours = daily;
            }
        }

        if (weeklyInput) {
            const weekly = parseFloat(weeklyInput.value);
            if (!isNaN(weekly) && weekly > 0) {
                this.settings.weeklyHours = weekly;
            }
        }

        if (holidaysInput) {
            const holidaysText = holidaysInput.value || '';
            const holidays = holidaysText
                .split(/\r?\n/)
                .map(s => s.trim())
                .filter(s => s);
            this.settings.holidays = holidays;
        }

        if (showJustificationInput) {
            this.settings.showJustificationPopup = showJustificationInput.checked;
        }

        // Salvar timezone selecionado
        const timezoneSelect = document.getElementById('timezoneSelect');
        if (timezoneSelect) {
            this.settings.timeZone = timezoneSelect.value || null;
        }

        this.saveSettings();
        this.updateUI();
    }

    populateTimezoneSelect() {
        const timezoneSelect = document.getElementById('timezoneSelect');
        if (!timezoneSelect) return;

        // Principais fusos horários do mundo
        const commonTimezones = [
            { value: '', label: 'Usar fuso do sistema' },
            
            // América
            { value: 'America/New_York', label: 'Nova York (UTC-5/-4)' },
            { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8/-7)' },
            { value: 'America/Chicago', label: 'Chicago (UTC-6/-5)' },
            { value: 'America/Denver', label: 'Denver (UTC-7/-6)' },
            { value: 'America/Mexico_City', label: 'Cidade do México (UTC-6/-5)' },
            { value: 'America/Toronto', label: 'Toronto (UTC-5/-4)' },
            { value: 'America/Vancouver', label: 'Vancouver (UTC-8/-7)' },
            { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (UTC-3)' },
            { value: 'America/Santiago', label: 'Santiago (UTC-4/-3)' },
            { value: 'America/Lima', label: 'Lima (UTC-5)' },
            { value: 'America/Bogota', label: 'Bogotá (UTC-5)' },
            { value: 'America/Caracas', label: 'Caracas (UTC-4)' },
            
            // Brasil
            { value: 'America/Sao_Paulo', label: 'São Paulo (UTC-3)' },
            { value: 'America/Noronha', label: 'Fernando de Noronha (UTC-2)' },
            { value: 'America/Manaus', label: 'Manaus (UTC-4)' },
            { value: 'America/Rio_Branco', label: 'Rio Branco (UTC-5)' },
            
            // Europa
            { value: 'Europe/London', label: 'Londres (UTC+0/+1)' },
            { value: 'Europe/Paris', label: 'Paris (UTC+1/+2)' },
            { value: 'Europe/Berlin', label: 'Berlim (UTC+1/+2)' },
            { value: 'Europe/Rome', label: 'Roma (UTC+1/+2)' },
            { value: 'Europe/Madrid', label: 'Madri (UTC+1/+2)' },
            { value: 'Europe/Amsterdam', label: 'Amsterdã (UTC+1/+2)' },
            { value: 'Europe/Stockholm', label: 'Estocolmo (UTC+1/+2)' },
            { value: 'Europe/Moscow', label: 'Moscou (UTC+3)' },
            { value: 'Europe/Istanbul', label: 'Istambul (UTC+3)' },
            { value: 'Europe/Athens', label: 'Atenas (UTC+2/+3)' },
            
            // Ásia
            { value: 'Asia/Tokyo', label: 'Tóquio (UTC+9)' },
            { value: 'Asia/Shanghai', label: 'Xangai (UTC+8)' },
            { value: 'Asia/Hong_Kong', label: 'Hong Kong (UTC+8)' },
            { value: 'Asia/Singapore', label: 'Cingapura (UTC+8)' },
            { value: 'Asia/Seoul', label: 'Seul (UTC+9)' },
            { value: 'Asia/Bangkok', label: 'Bangcoc (UTC+7)' },
            { value: 'Asia/Jakarta', label: 'Jacarta (UTC+7)' },
            { value: 'Asia/Manila', label: 'Manila (UTC+8)' },
            { value: 'Asia/Kolkata', label: 'Nova Delhi (UTC+5:30)' },
            { value: 'Asia/Dubai', label: 'Dubai (UTC+4)' },
            
            // África
            { value: 'Africa/Cairo', label: 'Cairo (UTC+2)' },
            { value: 'Africa/Lagos', label: 'Lagos (UTC+1)' },
            { value: 'Africa/Johannesburg', label: 'Joanesburgo (UTC+2)' },
            { value: 'Africa/Casablanca', label: 'Casablanca (UTC+0/+1)' },
            
            // Oceania
            { value: 'Australia/Sydney', label: 'Sydney (UTC+10/+11)' },
            { value: 'Australia/Melbourne', label: 'Melbourne (UTC+10/+11)' },
            { value: 'Australia/Perth', label: 'Perth (UTC+8)' },
            { value: 'Pacific/Auckland', label: 'Auckland (UTC+12/+13)' },
            
            // Outros importantes
            { value: 'UTC', label: 'UTC (Temporal Universal Coordenado)' },
            { value: 'Asia/Kolkata', label: 'Índia (UTC+5:30)' },
            { value: 'Asia/Tehran', label: 'Teerã (UTC+3:30/+4:30)' }
        ];

        // Limpar opções existentes (exceto a primeira)
        timezoneSelect.innerHTML = '';
        
        // Adicionar opções
        commonTimezones.forEach(tz => {
            const option = document.createElement('option');
            option.value = tz.value;
            option.textContent = tz.label;
            timezoneSelect.appendChild(option);
        });
    }

    needsJustification(date) {
        const hour = date.getHours();
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isHoliday = this.isHoliday(date);
        const needs = isWeekend || isHoliday || hour < 6 || hour >= 22;
        console.log(`🕒 Verificação justificativa: ${needs} (hora: ${hour}, fim de semana: ${isWeekend}, feriado: ${isHoliday})`);
        return needs;
    }

    isHoliday(date) {
        const formatted = this.formatDate(date);
        return (this.settings.holidays || []).includes(formatted);
    }

    openTimeEditModal(record) {
        console.log('⏰ Abrindo modal de edição de horário');
        this.currentRecord = record;
        const modal = document.getElementById('timeEditModal');
        const timeInput = document.getElementById('timeEditInput');
        
        if (modal) {
            modal.classList.add('show');
        }
        
        if (timeInput) {
            const time = record.time; // formato HH:MM
            if (time && time.length >= 4) {
                timeInput.value = time;
            } else {
                timeInput.value = '';
            }
        }
    }

    openJustificationModal(record) {
        console.log('📋 Abrindo modal de justificativa');
        const modal = document.getElementById('justificationModal');
        const dateInput = document.getElementById('editDateInput');
        const timeInput = document.getElementById('editTimeInput');
        const justificationInput = document.getElementById('justificationText');
        
        if (modal) {
            modal.classList.add('show');
        }
        
        if (dateInput && record) {
            // Preencher a data no formato YYYY-MM-DD para o input date
            const recordDate = new Date(record.timestamp);
            const dateStr = recordDate.toISOString().split('T')[0];
            dateInput.value = dateStr;
            console.log('📅 Campo de data preenchido com:', dateInput.value);
        }
        
        if (timeInput && record) {
            const time = record.time; // formato HH:MM
            console.log('🕐 Preenchendo horário no modal:', time);
            console.log('🔍 Elemento timeInput encontrado:', timeInput);
            console.log('🔍 ID do elemento:', timeInput.id);
            console.log('🔍 Modal do elemento:', timeInput.closest('.modal')?.id);
            console.log('🔍 Valor atual do timeInput:', timeInput.value);
            console.log('🔍 Tipo do campo:', timeInput.type);
            
            // Limpar primeiro para garantir que não há cache
            timeInput.value = '';
            
            if (time && time.length >= 4) {
                // Se o horário tiver segundos, remover para o campo time
                const cleanTime = time.split(':').slice(0, 2).join(':');
                timeInput.value = cleanTime;
                console.log('✅ Campo de horário preenchido com:', timeInput.value, '(original:', time, ')');
            } else {
                timeInput.value = '';
                console.log('⚠️ Campo de horário vazio');
            }
            
            // Forçar o campo a ser editável
            timeInput.disabled = false;
            timeInput.readOnly = false;
            console.log('🔓 Campo liberado para edição');
        }
        
        if (justificationInput && record) {
            justificationInput.value = record.justification || '';
        }
    }

    closeModal() {
        console.log('🔒 Fechando modal');
        const justificationModal = document.getElementById('justificationModal');
        const timeEditModal = document.getElementById('timeEditModal');
        
        if (justificationModal) {
            justificationModal.classList.remove('show');
        }
        
        if (timeEditModal) {
            timeEditModal.classList.remove('show');
        }
        
        // Limpar campos
        const justificationInput = document.getElementById('justificationText');
        const timeInput = document.getElementById('editTimeInput');
        const dateInput = document.getElementById('editDateInput');
        
        if (justificationInput) {
            justificationInput.value = '';
        }
        
        if (timeInput) {
            timeInput.value = '';
        }
        
        if (dateInput) {
            dateInput.value = '';
        }
        
        this.currentJustification = null;
        this.currentRecord = null;
    }

    showNotification(message, type = 'info') {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Mostrar notificação
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Esconder após 5 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    
    saveJustification() {
        try {
            const justificationInput = document.getElementById('justificationText');
            const dateInput = document.getElementById('editDateInput');
            const timeInput = document.getElementById('editTimeInput');
            
            if (!justificationInput) {
                throw new Error('Campo de justificativa não encontrado');
            }
            
            const text = justificationInput.value.trim();
            console.log('💾 Salvando justificativa:', text);
            
            if (!this.currentJustification) {
                throw new Error('Nenhum registro selecionado para justificar');
            }
            
            if (this.currentJustification.type === 'new') {
                this.currentJustification.record.justification = text || null;
                this.saveRecord(this.currentJustification.record);
            } else {
                let newTime = null;
                let newDate = null;
                
                if (timeInput && !timeInput.disabled && timeInput.value) {
                    console.log('DEBUG: timeInput.value=', timeInput.value);
                    newTime = timeInput.value; // HH:MM
                    console.log('🕐 Novo horário informado:', newTime);
                }
                
                if (dateInput && dateInput.value) {
                    newDate = dateInput.value; // YYYY-MM-DD
                    console.log('📅 Nova data informada:', newDate);
                }
                
                console.log('💾 Atualizando registro ID:', this.currentJustification.record.id, 'com data:', newDate, 'e horário:', newTime);
                this.updateRecordJustification(this.currentJustification.record.id, text || null, newTime, newDate);
            }
            
            this.showNotification('Justificativa salva com sucesso!', 'success');
            this.closeModal();
            
        } catch (error) {
            console.error('❌ Erro ao salvar justificativa:', error);
            this.showNotification(`Erro: ${error.message}`, 'error');
        }
    }

    validateRecordConsistency(newRecord) {
        // Verifica se já existe um registro do mesmo tipo no mesmo dia
        const sameDayRecords = this.records.filter(r => r.date === newRecord.date);
        
        // Verifica se já existe um registro do mesmo tipo no mesmo dia
        const duplicate = sameDayRecords.find(r => 
            r.type === newRecord.type && 
            r.time === newRecord.time
        );
        
        if (duplicate) {
            throw new Error('Já existe um registro idêntico para este horário');
        }
        
        // Validações específicas por tipo de registro
        if (newRecord.type === 'break_end') {
            const hasBreakStart = sameDayRecords.some(r => r.type === 'break_start');
            if (!hasBreakStart) {
                throw new Error('Não há pausa iniciada para este dia');
            }
        }
    }

    saveRecord(record) {
        try {
            console.log('💾 Salvando registro:', record);
            
            // Valida o registro antes de salvar
            if (!record || typeof record !== 'object') {
                throw new Error('Registro inválido');
            }
            
            const requiredFields = ['id', 'type', 'timestamp', 'date', 'time'];
            for (const field of requiredFields) {
                if (!(field in record)) {
                    throw new Error(`Campo obrigatório ausente: ${field}`);
                }
            }
            
            // Adiciona o novo registro
            this.records.push(record);
            
            // Ordena por timestamp
            this.records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
            // Limita o armazenamento local a 1000 registros
            if (this.records.length > 1000) {
                this.records = this.records.slice(-1000);
                console.warn('Limite de 1000 registros atingido. Os registros mais antigos foram removidos.');
            }
            
            // Salva no localStorage
            localStorage.setItem('timeRecords', JSON.stringify(this.records));
            console.log('✅ Registro salvo! Total:', this.records.length);
            
            this.loadTimeRecords();
            this.updateUI();
            
        } catch (error) {
            console.error('❌ Erro ao salvar registro:', error);
            throw error; // Re-lança para tratamento no método chamador
        }
    }

    updateRecordJustification(recordId, justification, newTime, newDate) {
        console.log('✏️ Atualizando justificativa para registro:', recordId);
        const record = this.records.find(r => r.id === recordId);
        if (record) {
            console.log('📋 Registro encontrado:', record);
            record.justification = justification;

            if (newTime || newDate) {
                // Atualiza data e/ou horário
                console.log('📅 Data original do registro:', record.date);
                console.log('🕐 Novo horário:', newTime);
                console.log('📅 Nova data:', newDate);
                
                // Usar nova data se fornecida, senão manter a original
                const finalDate = newDate || record.date;
                const finalTime = newTime || record.time;
                
                // Criar timestamp com a nova data e horário
                const timestamp = `${finalDate}T${finalTime}:00`;
                console.log('📅 Timestamp criado:', timestamp);
                
                // Atualizar o registro
                record.timestamp = timestamp;
                record.time = finalTime;
                record.date = finalDate;
                
                console.log('✅ Registro atualizado - Timestamp:', record.timestamp, 'Time:', record.time, 'Date:', record.date);
                console.log('🔄 Horário formatado:', newTime, '->', record.time);
                console.log('🔄 Data formatada:', newDate, '->', record.date);
            }

            // Reordena registros após alteração de data/horário
            this.records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            console.log('💾 Salvando registros atualizados:', this.records.map(r => ({ id: r.id, time: r.time, date: r.date })));
            localStorage.setItem('timeRecords', JSON.stringify(this.records));
            this.loadTimeRecords();
            this.updateUI();
        } else {
            console.error('❌ Registro não encontrado:', recordId);
        }
    }

    editRecord(recordId) {
        console.log('✏️ Editando registro:', recordId);
        console.log('📋 Registros disponíveis:', this.records.map(r => ({ id: r.id, type: r.type, time: r.time })));
        const record = this.records.find(r => r.id === recordId);
        if (record) {
            console.log('✅ Registro encontrado:', record);
            this.currentJustification = { record, type: 'edit' };
            this.openJustificationModal(record);
        } else {
            console.error('❌ Registro não encontrado para ID:', recordId);
            this.showNotification('Registro não encontrado!', 'error');
        }
    }

    loadTimeRecords() {
        console.log('📊 Carregando registros...');
        const period = document.getElementById('periodFilter')?.value || 'today';
        const filteredRecords = this.filterRecordsByPeriod(period);
        const groupedRecords = this.groupRecordsByDate(filteredRecords);
        
        // Configurar paginação
        this.totalRecords = Object.keys(groupedRecords).length;
        this.totalPages = Math.ceil(this.totalRecords / this.recordsPerPage);
        
        // Resetar página atual se necessário
        if (this.currentPage > this.totalPages) {
            this.currentPage = 1;
        }
        
        // Obter registros da página atual
        const paginatedRecords = this.getPaginatedRecords(groupedRecords);
        this.displayRecords(paginatedRecords, groupedRecords);
        this.updatePaginationControls();
    }

    filterRecordsByPeriod(period) {
        const now = new Date();
        const today = this.formatDate(now);

        switch (period) {
            case 'today':
                return this.records.filter(record => record.date === today);
            case 'week':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return this.records.filter(record => new Date(record.timestamp) >= weekAgo);
            case 'month':
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                return this.records.filter(record => new Date(record.timestamp) >= monthAgo);
            default:
                return this.records;
        }
    }

    groupRecordsByDate(records) {
        const grouped = {};
        
        records.forEach(record => {
            if (!grouped[record.date]) {
                grouped[record.date] = [];
            }
            grouped[record.date].push(record);
        });

        return grouped;
    }

    renderHistory(groupedRecords) {
        const historyList = document.getElementById('historyList');
        
        if (Object.keys(groupedRecords).length === 0) {
            historyList.innerHTML = '<div class="day-card">Nenhum registro encontrado para o período selecionado.</div>';
            return;
        }

        const html = Object.entries(groupedRecords)
            .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
            .map(([date, records]) => this.renderDayCard(date, records))
            .join('');

        historyList.innerHTML = html;
    }

    renderDayCard(date, records) {
        const totalHours = this.calculateDayTotal(records);
        const dateObj = new Date(date + 'T00:00:00');
        const dateString = dateObj.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const recordsHtml = records.map(record => this.renderRecordItem(record)).join('');

        return `
            <div class="day-card">
                <div class="day-header">
                    <div class="day-date">${totalHours} - ${dateString}</div>
                </div>
                ${recordsHtml}
            </div>
        `;
    }

    renderRecordItem(record) {
        const typeLabels = {
            'start': 'Início Jornada',
            'break_start': 'Início Pausa',
            'break_end': 'Fim Pausa',
            'end': 'Fim Jornada'
        };

        const justificationHtml = record.justification ? `
            <div class="record-justification">
                <span class="justification-icon">📝</span>
                <span class="justification-text">${record.justification}</span>
            </div>
        ` : '';

        return `
            <div class="record-item">
                <div class="record-time">${record.time}</div>
                <div class="record-type">${typeLabels[record.type]}</div>
                ${justificationHtml}
                <div class="record-actions">
                    <button class="btn btn-edit" onclick="tracker.editRecord(${record.id})">
                        Editar
                    </button>
                    <button class="btn btn-edit" onclick="tracker.deleteRecord(${record.id})" style="background: #e74c3c;">
                        Excluir
                    </button>
                </div>
            </div>
        `;
    }

    
    calculateDayTotal(records) {
        const totalMinutes = this.calculateDayTotalMinutes(records);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.floor(totalMinutes % 60);
        return `${hours}h ${minutes}min`;
    }

    updateStatistics(records, period) {
        const { totalHours, overtime, workDays } = this.calculateStatistics(records, period);
        
        document.getElementById('totalHours').textContent = totalHours;
        document.getElementById('overtime').textContent = overtime;
        document.getElementById('workDays').textContent = workDays;
    }

    calculateStatistics(records, period = 'all') {
        const grouped = this.groupRecordsByDate(records);
        let totalMinutes = 0;
        const workDays = Object.keys(grouped).length;

        Object.entries(grouped).forEach(([date, dayRecords]) => {
            const dayTotal = this.calculateDayTotalMinutes(dayRecords);
            totalMinutes += dayTotal;
        });

        const dailyMinutes = (this.settings.dailyHours || 8) * 60;
        const weeklyMinutesCfg = (this.settings.weeklyHours || 40) * 60;

        let standardMinutes = 0;

        if (period === 'week') {
            // Base semanal: considera jornada semanal configurada,
            // descontando um dia de jornada para cada feriado na semana.
            let holidaysInWeek = 0;
            Object.keys(grouped).forEach(dateStr => {
                const dayDate = new Date(dateStr + 'T00:00:00');
                if (this.isHoliday(dayDate)) {
                    holidaysInWeek += 1;
                }
            });

            const adjustedWeeklyMinutes = Math.max(
                0,
                weeklyMinutesCfg - holidaysInWeek * dailyMinutes
            );
            standardMinutes = adjustedWeeklyMinutes;
        } else {
            // Base diária por dia trabalhado (exceto feriados)
            Object.keys(grouped).forEach(dateStr => {
                const dayDate = new Date(dateStr + 'T00:00:00');
                if (!this.isHoliday(dayDate)) {
                    standardMinutes += dailyMinutes;
                }
            });
        }
        const overtimeMinutes = Math.max(0, totalMinutes - standardMinutes);
        
        const totalHours = this.formatHoursMinutes(totalMinutes);
        const overtime = this.formatHoursMinutes(overtimeMinutes);

        return { totalHours, overtime, workDays };
    }

    calculateDayTotalMinutes(records) {
        let totalMinutes = 0;
        let segmentStart = null; // início de um período efetivo de trabalho

        records.forEach(record => {
            const recordTime = new Date(record.timestamp);

            switch (record.type) {
                case 'start':
                case 'break_end':
                    // Início de um período de trabalho
                    segmentStart = recordTime;
                    break;
                case 'break_start':
                case 'end':
                    // Fim de um período de trabalho
                    if (segmentStart) {
                        totalMinutes += (recordTime - segmentStart) / (1000 * 60);
                        segmentStart = null;
                    }
                    break;
            }
        });

        return totalMinutes;
    }

    formatHoursMinutes(totalMinutes) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.floor(totalMinutes % 60);
        return `${hours}h ${minutes}min`;
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    updateUI() {
        console.log('🎨 Atualizando UI...');
        const today = this.formatDate(new Date());
        const todayRecords = this.records.filter(record => record.date === today);
        const status = this.getCurrentStatus(todayRecords);
        
        document.getElementById('currentStatus').textContent = status.text;
        document.getElementById('currentStatus').style.color = status.color;
        
        const todayHours = this.calculateDayTotal(todayRecords);
        document.getElementById('todayHours').textContent = `Horas hoje: ${todayHours}`;

        // Verificar jornada diária
        this.checkDailyJourney(todayRecords);

        // Atualizar tempo de trabalho em tempo real
        this.updateCurrentWorkTime(todayRecords);

        this.updateButtonStates(todayRecords);
        this.updateDBStatus();

        console.log('✅ UI atualizada!');
    }

    getCurrentStatus(records) {
        if (records.length === 0) {
            return { text: 'Não iniciado', color: '#e74c3c' };
        }

        const lastRecord = records[records.length - 1];
        
        switch (lastRecord.type) {
            case 'start':
                return { text: 'Trabalhando', color: '#27ae60' };
            case 'break_start':
                return { text: 'Em pausa', color: '#f39c12' };
            case 'break_end':
                return { text: 'Trabalhando', color: '#27ae60' };
            case 'end':
                return { text: 'Jornada encerrada', color: '#e74c3c' };
            default:
                return { text: 'Não iniciado', color: '#e74c3c' };
        }
    }

    updateButtonStates(records) {
        const lastRecord = records[records.length - 1];
        
        // Iniciar Jornada: só habilita se ainda não houve jornada hoje
        document.getElementById('btnStart').disabled = !!lastRecord && 
            lastRecord.type !== 'end';

        // Iniciar Pausa: habilita quando está trabalhando (após start ou após retorno de uma pausa)
        document.getElementById('btnBreak').disabled = !lastRecord || 
            !['start', 'break_end'].includes(lastRecord.type);

        // Retornar: apenas durante a pausa
        document.getElementById('btnReturn').disabled = !lastRecord || 
            lastRecord.type !== 'break_start';

        // Encerrar Jornada: habilita enquanto a jornada está aberta (não em pausa e não encerrada)
        document.getElementById('btnEnd').disabled = !lastRecord || 
            lastRecord.type === 'end' || lastRecord.type === 'break_start';

        console.log('🔘 Estados dos botões atualizados');
    }

    updateDBStatus() {
        const statusElement = document.getElementById('dbStatus');
        const totalRecords = this.records.length;
        statusElement.textContent = `📊 ${totalRecords} registros | 💾 LocalStorage`;
        statusElement.className = 'db-status success';
    }

    exportData() {
        const dataStr = JSON.stringify(this.records, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `time_tracker_${this.formatDate(new Date())}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        alert('Dados exportados com sucesso!');
    }

    handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (Array.isArray(importedData)) {
                    if (confirm(`Importar ${importedData.length} registros? Isso substituirá os dados atuais.`)) {
                        this.records = importedData;
                        localStorage.setItem('timeRecords', JSON.stringify(this.records));
                        this.loadTimeRecords();
                        this.updateUI();
                        alert('Dados importados com sucesso!');
                    }
                } else {
                    alert('Arquivo inválido!');
                }
            } catch (error) {
                alert('Erro ao importar arquivo!');
                console.error(error);
            }
        };
        reader.readAsText(file);
        
        // Limpar input
        event.target.value = '';
    }

    updateCurrentTime() {
        const now = new Date();
        
        const timeString = now.toLocaleTimeString('pt-BR', {
            timeZone: this.timeZone,
            hour12: false
        });
        
        const dateString = now.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: this.timeZone
        });
        
        const currentTimeElement = document.getElementById('currentTime');
        if (currentTimeElement) {
            currentTimeElement.textContent = `${dateString} - ${timeString} (${this.timeZone})`;
        }
        
        // Atualizar o status do banco de dados com informação de fuso horário
        const dbStatus = document.getElementById('dbStatus');
        if (dbStatus && !dbStatus.dataset.initialized) {
            dbStatus.textContent = `Sistema operando no fuso horário: ${this.timeZone}`;
            dbStatus.dataset.initialized = 'true';
        }
    }

    // Método auxiliar para criar data no fuso correto
    createDateInTimeZone(dateString) {
        const date = new Date(dateString);
        // Ajustar para o fuso America/Sao_Paulo se necessário
        return date;
    }

    saveRecord(record) {
        try {
            console.log('💾 Salvando registro:', record);
            
            if (!record || typeof record !== 'object') {
                throw new Error('Registro inválido');
            }
            
            const requiredFields = ['id', 'type', 'timestamp', 'date', 'time'];
            for (const field of requiredFields) {
                if (!(field in record)) {
                    throw new Error(`Campo obrigatório ausente: ${field}`);
                }
            }
            
            this.records.push(record);
            this.records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
            if (this.records.length > 1000) {
                this.records = this.records.slice(-1000);
                console.warn('Limite de 1000 registros atingido.');
            }
            
            localStorage.setItem('timeRecords', JSON.stringify(this.records));
            console.log('✅ Registro salvo! Total:', this.records.length);
            
            this.loadTimeRecords();
            this.updateUI();
            
        } catch (error) {
            console.error('❌ Erro ao salvar registro:', error);
            throw error;
        }
    }

    
    deleteRecord(recordId) {
        console.log('🗑️ Excluindo registro:', recordId);
        if (confirm('Tem certeza que deseja excluir este registro?')) {
            this.records = this.records.filter(r => r.id !== recordId);
            localStorage.setItem('timeRecords', JSON.stringify(this.records));
            this.loadTimeRecords();
            this.updateUI();
        }
    }

    groupRecordsByDate(records) {
        const grouped = {};
        records.forEach(record => {
            if (!grouped[record.date]) {
                grouped[record.date] = [];
            }
            grouped[record.date].push(record);
        });
        return grouped;
    }

    getPaginatedRecords(groupedRecords) {
        const dates = Object.keys(groupedRecords).sort((a, b) => new Date(b) - new Date(a));
        const startIndex = (this.currentPage - 1) * this.recordsPerPage;
        const endIndex = startIndex + this.recordsPerPage;
        const paginatedDates = dates.slice(startIndex, endIndex);
        
        const paginatedRecords = {};
        paginatedDates.forEach(date => {
            paginatedRecords[date] = groupedRecords[date];
        });
        
        return paginatedRecords;
    }

    displayRecords(groupedRecords, allGroupedRecords = null) {
        const container = document.getElementById('historyList');
        console.log('🔍 Container historyList encontrado:', container);
        if (!container) {
            console.error('❌ Container historyList não encontrado!');
            return;
        }

        console.log('📋 Exibindo registros agrupados:', groupedRecords);
        console.log('📊 Número de dias:', Object.keys(groupedRecords).length);
        
        container.innerHTML = '';
        
        // Adicionar mensagem de depuração
        if (Object.keys(groupedRecords).length === 0) {
            container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">Nenhum registro encontrado para o período selecionado.</p>';
            return;
        }
        
        // Usar renderHistory para manter o formato existente
        this.renderHistory(groupedRecords);
    }

    updatePaginationControls() {
        const paginationControls = document.getElementById('paginationControls');
        const paginationInfo = document.getElementById('paginationInfo');
        const currentPageSpan = document.getElementById('currentPage');
        const btnFirst = document.getElementById('btnFirstPage');
        const btnPrev = document.getElementById('btnPrevPage');
        const btnNext = document.getElementById('btnNextPage');
        const btnLast = document.getElementById('btnLastPage');

        // Mostrar ou ocultar controles de paginação
        if (this.totalPages <= 1) {
            paginationControls.style.display = 'none';
            return;
        } else {
            paginationControls.style.display = 'flex';
        }

        // Atualizar informações
        const startRecord = (this.currentPage - 1) * this.recordsPerPage + 1;
        const endRecord = Math.min(this.currentPage * this.recordsPerPage, this.totalRecords);
        paginationInfo.textContent = `Mostrando ${startRecord}-${endRecord} de ${this.totalRecords} dias`;
        currentPageSpan.textContent = `Página ${this.currentPage}`;

        // Habilitar/desabilitar botões
        btnFirst.disabled = this.currentPage === 1;
        btnPrev.disabled = this.currentPage === 1;
        btnNext.disabled = this.currentPage === this.totalPages;
        btnLast.disabled = this.currentPage === this.totalPages;
    }

    // Métodos de navegação da paginação
    goToFirstPage() {
        this.currentPage = 1;
        this.loadTimeRecords();
    }

    goToPrevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadTimeRecords();
        }
    }

    goToNextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.loadTimeRecords();
        }
    }

    goToLastPage() {
        this.currentPage = this.totalPages;
        this.loadTimeRecords();
    }

    getTypeLabel(type) {
        const labels = {
            'start': 'Início',
            'break_start': 'Início Pausa',
            'break_end': 'Fim Pausa',
            'end': 'Fim'
        };
        return labels[type] || type;
    }

    
    
    updateCurrentStatus(todayRecords) {
        const statusElement = document.getElementById('currentStatus');
        if (!statusElement) return;
        
        if (todayRecords.length === 0) {
            statusElement.textContent = 'Não iniciado';
            statusElement.className = 'status status-idle';
        } else {
            const hasStart = todayRecords.some(r => r.type === 'start');
            const hasEnd = todayRecords.some(r => r.type === 'end');
            const breakStartRecords = todayRecords.filter(r => r.type === 'break_start');
            const breakEndRecords = todayRecords.filter(r => r.type === 'break_end');
            const hasUnfinishedBreak = breakStartRecords.length > breakEndRecords.length;
            
            if (hasEnd) {
                statusElement.textContent = 'Jornada encerrada';
                statusElement.className = 'status status-completed';
            } else if (hasUnfinishedBreak) {
                statusElement.textContent = 'Em pausa';
                statusElement.className = 'status status-break';
            } else if (hasStart) {
                statusElement.textContent = 'Em jornada';
                statusElement.className = 'status status-working';
            } else {
                statusElement.textContent = 'Não iniciado';
                statusElement.className = 'status status-idle';
            }
        }
    }

    checkDailyJourney(todayRecords) {
        if (!todayRecords || todayRecords.length < 2) return;
        
        // Encontrar o primeiro registro do dia (início)
        const startRecord = todayRecords.find(r => r.type === 'start');
        if (!startRecord) return;
        
        // Calcular horas trabalhadas
        const workedHours = this.calculateWorkedHours(todayRecords);
        const dailyHours = this.settings.dailyHours || 8;
        
        console.log(`⏰ Horas trabalhadas: ${workedHours}h, Jornada: ${dailyHours}h`);
        
        // Verificar se atingiu ou ultrapassou a jornada
        if (workedHours >= dailyHours) {
            // Verificar se já alertou hoje
            const today = this.formatDate(new Date());
            const lastAlertKey = `journey_alert_${today}`;
            const lastAlert = localStorage.getItem(lastAlertKey);
            
            if (!lastAlert) {
                this.showJourneyAlert(workedHours, dailyHours);
                // Marcar que já alertou hoje
                localStorage.setItem(lastAlertKey, new Date().toISOString());
            }
        }
    }

    calculateWorkedHours(records) {
        console.log('🔍 Calculando horas trabalhadas com', records.length, 'registros');
        
        // Ordenar registros por timestamp
        records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Encontrar registros específicos
        const startRecord = records.find(r => r.type === 'start');
        const endRecord = records.find(r => r.type === 'end');
        const breakStartRecord = records.find(r => r.type === 'break_start');
        const breakEndRecord = records.find(r => r.type === 'break_end');
        
        console.log('🔍 Registros encontrados:', {
            start: startRecord?.time,
            end: endRecord?.time,
            breakStart: breakStartRecord?.time,
            breakEnd: breakEndRecord?.time
        });
        
        if (!startRecord) {
            console.log('❌ Nenhum registro de início encontrado');
            return 0;
        }
        
        // 1. Calcular tempo total (fim - início)
        let totalWorkMinutes = 0;
        
        if (endRecord) {
            // Usar horário do registro de fim
            const [startHours, startMinutes] = startRecord.time.split(':').map(Number);
            const [endHours, endMinutes] = endRecord.time.split(':').map(Number);
            
            const startTotalMinutes = startHours * 60 + startMinutes;
            const endTotalMinutes = endHours * 60 + endMinutes;
            
            totalWorkMinutes = endTotalMinutes - startTotalMinutes;
            if (totalWorkMinutes < 0) totalWorkMinutes += 24 * 60;
            
            console.log(`⏰ Tempo total: ${endRecord.time} - ${startRecord.time} = ${totalWorkMinutes}min`);
        } else {
            // Usar horário atual com fuso horário correto
            const now = new Date();
            const [startHours, startMinutes] = startRecord.time.split(':').map(Number);
            const startTotalMinutes = startHours * 60 + startMinutes;
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            
            totalWorkMinutes = currentMinutes - startTotalMinutes;
            if (totalWorkMinutes < 0) totalWorkMinutes += 24 * 60;
            
            console.log(`⏰ Tempo total (usando agora): ${currentMinutes}min - ${startTotalMinutes}min = ${totalWorkMinutes}min`);
            console.log(`🌍 Agora: ${now.toLocaleString()}`);
        }
        
        // 2. Calcular tempo de pausa (todas as pausas do dia)
        let breakMinutes = 0;
        
        // Agrupar pausas por pares (break_start + break_end)
        const breakStartRecords = records.filter(r => r.type === 'break_start');
        const breakEndRecords = records.filter(r => r.type === 'break_end');
        
        console.log(`🔍 Pausas encontradas: ${breakStartRecords.length} inícios, ${breakEndRecords.length} fins`);
        
        // Para cada início de pausa, encontrar o fim correspondente
        breakStartRecords.forEach((startRecord, index) => {
            const correspondingEnd = breakEndRecords[index];
            if (correspondingEnd) {
                const [startHours, startMinutes] = startRecord.time.split(':').map(Number);
                const [endHours, endMinutes] = correspondingEnd.time.split(':').map(Number);
                
                const startTotalMinutes = startHours * 60 + startMinutes;
                const endTotalMinutes = endHours * 60 + endMinutes;
                
                let thisBreakMinutes = endTotalMinutes - startTotalMinutes;
                if (thisBreakMinutes < 0) thisBreakMinutes += 24 * 60;
                
                breakMinutes += thisBreakMinutes;
                console.log(`⏰ Pausa ${index + 1}: ${correspondingEnd.time} - ${startRecord.time} = ${thisBreakMinutes}min`);
            } else {
                console.log(`⚠️ Pausa ${index + 1} sem fim correspondente: ${startRecord.time}`);
            }
        });
        
        console.log(`⏰ Total tempo de pausa: ${breakMinutes}min`);
        
        // 3. Calcular horas trabalhadas (total - pausa)
        const workedMinutes = totalWorkMinutes - breakMinutes;
        const workedHours = workedMinutes / 60;
        
        console.log(`📊 Cálculo final:`);
        console.log(`   Tempo total: ${totalWorkMinutes}min`);
        console.log(`   Tempo pausa: ${breakMinutes}min`);
        console.log(`   Trabalhado: ${workedMinutes}min = ${workedHours.toFixed(2)}h`);
        
        return Math.max(0, workedHours); // Garantir não negativo
    }

    showJourneyAlert(workedHours, dailyHours) {
        const overtime = workedHours - dailyHours;
        const overtimeHours = Math.floor(overtime);
        const overtimeMinutes = Math.round((overtime - overtimeHours) * 60);
        
        let message = `🎉 Jornada diária de ${dailyHours}h completada!\n`;
        message += `⏰ Total trabalhado: ${Math.floor(workedHours)}h ${Math.round((workedHours - Math.floor(workedHours)) * 60)}min\n`;
        
        if (overtime > 0) {
            message += `⭐ Horas extras: ${overtimeHours}h ${overtimeMinutes}min`;
        }
        
        // Criar notificação especial
        const notification = document.createElement('div');
        notification.className = 'notification journey-complete';
        notification.innerHTML = `
            <div class="journey-icon">🎯</div>
            <div class="journey-content">
                <h4>Jornada Completa!</h4>
                <p>${message.replace(/\n/g, '<br>')}</p>
                <button class="btn btn-sm btn-primary" onclick="this.parentElement.parentElement.remove()">OK</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Mostrar notificação
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Auto-remover após 10 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }
        }, 10000);
        
        // Também mostrar notificação normal
        this.showNotification(`Jornada de ${dailyHours}h completada! Total: ${Math.floor(workedHours)}h ${Math.round((workedHours - Math.floor(workedHours)) * 60)}min`, 'success');
    }

    updateCurrentWorkTime(todayRecords) {
        const workTimeElement = document.getElementById('currentWorkTime');
        const workTimeValue = document.getElementById('workTimeValue');
        
        console.log('🔍 Elementos encontrados:', { workTimeElement, workTimeValue });
        console.log('🔍 Registros de hoje:', todayRecords);
        
        if (!workTimeElement || !workTimeValue) {
            console.error('❌ Elementos do tempo de trabalho não encontrados!');
            return;
        }
        
        // Verificar se está trabalhando agora
        const status = this.getCurrentStatus(todayRecords);
        console.log('🔍 Status atual:', status);
        
        const isWorking = status.text !== 'Não iniciado' && 
                        status.text !== 'Em pausa' && 
                        status.text !== 'Jornada encerrada';
        
        console.log('🔍 Está trabalhando?', isWorking);
        
        if (!isWorking || todayRecords.length === 0) {
            // Esconder se não estiver trabalhando
            workTimeElement.classList.add('hidden');
            workTimeElement.classList.remove('active');
            console.log('🚫 Escondendo campo de tempo (não está trabalhando)');
            return;
        }
        
        // Mostrar e adicionar animação
        workTimeElement.classList.remove('hidden');
        workTimeElement.classList.add('active');
        
        // Calcular tempo trabalhado até agora
        console.log('🔍 Calculando tempo trabalhado...');
        const workedHours = this.calculateWorkedHours(todayRecords);
        console.log('🔍 Resultado do cálculo:', workedHours, 'horas');
        
        const hours = Math.floor(workedHours);
        const minutes = Math.round((workedHours - hours) * 60);
        
        // Formatar display
        let timeText = '';
        if (hours > 0) {
            timeText = `${hours}h ${minutes}min`;
        } else {
            timeText = `${minutes}min`;
        }
        
        workTimeValue.textContent = timeText;
        
        // Adicionar indicador visual se estiver próximo de completar jornada
        const dailyHours = this.settings.dailyHours || 8;
        if (workedHours >= dailyHours * 0.9) {
            workTimeElement.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
        } else if (workedHours >= dailyHours * 0.75) {
            workTimeElement.style.background = 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)';
        } else {
            workTimeElement.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }
        
        console.log(`⏱️ Tempo trabalhado em tempo real: ${timeText}`);
    }
}

// Inicializar a aplicação quando a página carregar
let tracker;
window.addEventListener('load', () => {
    console.log('📄 Página carregada, inicializando tracker...');
    tracker = new TimeTracker();
});

// Adicionar logs globais para debug
console.log('🔧 Script carregado!');

// Tratamento de erro global para evitar problemas com extensões do navegador
window.addEventListener('error', function(event) {
    // Ignorar erros relacionados à API chrome (geralmente de extensões)
    if (event.error && event.error.message && event.error.message.includes('chrome is not defined')) {
        console.warn('Ignorando erro da API chrome (provavelmente extensão do navegador):', event.error.message);
        event.preventDefault();
        return false;
    }
});

// Tratamento para erros de promessas não tratadas
window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message && event.reason.message.includes('chrome is not defined')) {
        console.warn('Ignorando rejeição não tratada da API chrome:', event.reason.message);
        event.preventDefault();
        return false;
    }
});
