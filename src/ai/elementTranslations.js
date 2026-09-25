// Translations of the names of the main Roam elements, so that the "/"
// picker of the request editor finds them when the user types in their own
// language, and shows the translated name next to the English one.
// The English `label` of the catalog remains the name inserted in the
// request (the model maps it to the selector). Several synonyms may be given
// in one string, separated by " / ".
//
// Order of the languages in every array:
export const LANGS = ["fr", "es", "de", "it", "pt", "nl", "ru", "zh", "ja", "ko"];

export const TRANSLATIONS = {
  // Layout
  ".roam-body": ["Corps de l'application / fond général", "Cuerpo de la aplicación / fondo general", "App-Hintergrund / Grundfläche", "Corpo dell'app / sfondo generale", "Corpo do aplicativo / fundo geral", "App-achtergrond", "Фон приложения", "应用背景", "アプリ全体の背景", "앱 배경"],
  ".roam-article": ["Colonne principale / contenu central", "Columna principal / contenido central", "Hauptspalte / Inhaltsbereich", "Colonna principale / contenuto centrale", "Coluna principal / conteúdo central", "Hoofdkolom / inhoud", "Основная колонка / содержимое", "主内容区", "メインコンテンツ", "본문 영역"],
  ".rm-article-wrapper": ["Largeur de la page", "Ancho de la página", "Seitenbreite", "Larghezza della pagina", "Largura da página", "Paginabreedte", "Ширина страницы", "页面宽度", "ページの幅", "페이지 너비"],
  ".rm-article-wrapper .roam-log-container .roam-log-page": ["Page de note quotidienne / daily notes", "Página de notas diarias", "Tagesnotiz-Seite", "Pagina delle note giornaliere", "Página de notas diárias", "Dagelijkse notitiepagina", "Страница ежедневных заметок", "每日笔记页面", "デイリーノートのページ", "데일리 노트 페이지"],
  // Top bar
  ".rm-topbar": ["Barre du haut / barre supérieure", "Barra superior", "Obere Leiste / Kopfleiste", "Barra superiore", "Barra superior", "Bovenbalk", "Верхняя панель", "顶部栏", "トップバー", "상단 바"],
  ".rm-find-or-create-wrapper": ["Champ de recherche", "Cuadro de búsqueda", "Suchfeld", "Campo di ricerca", "Caixa de pesquisa", "Zoekveld", "Поле поиска", "搜索框", "検索ボックス", "검색창"],
  // Sidebars
  ".roam-sidebar-container": ["Barre latérale gauche", "Barra lateral izquierda", "Linke Seitenleiste", "Barra laterale sinistra", "Barra lateral esquerda", "Linker zijbalk", "Левая боковая панель", "左侧边栏", "左サイドバー", "왼쪽 사이드바"],
  ".starred-pages": ["Raccourcis / pages favorites", "Accesos directos / páginas favoritas", "Verknüpfungen / Favoriten", "Scorciatoie / pagine preferite", "Atalhos / páginas favoritas", "Snelkoppelingen / favorieten", "Ярлыки / избранные страницы", "快捷方式 / 收藏页面", "ショートカット / お気に入り", "바로가기 / 즐겨찾기"],
  "#right-sidebar": ["Barre latérale droite", "Barra lateral derecha", "Rechte Seitenleiste", "Barra laterale destra", "Barra lateral direita", "Rechter zijbalk", "Правая боковая панель", "右侧边栏", "右サイドバー", "오른쪽 사이드바"],
  ".rm-sidebar-outline": ["Fenêtre de la barre latérale", "Ventana de la barra lateral", "Seitenleistenfenster", "Finestra della barra laterale", "Janela da barra lateral", "Zijbalkvenster", "Окно боковой панели", "侧边栏窗口", "サイドバーのウィンドウ", "사이드바 창"],
  // Titles & headings
  ".rm-title-display": ["Titre de la page", "Título de la página", "Seitentitel", "Titolo della pagina", "Título da página", "Paginatitel", "Заголовок страницы", "页面标题", "ページタイトル", "페이지 제목"],
  ".roam-log-page .rm-title-display": ["Titre de note quotidienne (journal)", "Título de nota diaria (diario)", "Titel der Tagesnotiz (Journal)", "Titolo della nota giornaliera", "Título da nota diária", "Titel van dagnotitie", "Заголовок ежедневной заметки", "每日笔记标题", "デイリーノートのタイトル", "일일 노트 제목"],
  ".rm-left-sidebar__daily-notes": ["Entrée Daily Notes / notes quotidiennes", "Entrada Daily Notes", "Eintrag Daily Notes", "Voce Daily Notes", "Entrada Daily Notes", "Daily Notes-item", "Пункт Daily Notes", "每日笔记入口", "デイリーノートの項目", "일일 노트 항목"],
  ".rm-unlinked-reference-container": ["Section des références non liées", "Sección de referencias no vinculadas", "Abschnitt nicht verknüpfter Referenzen", "Sezione riferimenti non collegati", "Seção de referências não vinculadas", "Sectie niet-gekoppelde verwijzingen", "Раздел несвязанных упоминаний", "未关联引用区域", "リンクされていない参照のセクション", "연결되지 않은 참조 섹션"],
  ".rm-table th": ["En-tête de tableau / cellule d'en-tête", "Encabezado de tabla", "Tabellenkopfzelle", "Intestazione di tabella", "Cabeçalho de tabela", "Tabelkopcel", "Заголовок таблицы", "表头单元格", "表のヘッダーセル", "표 머리글 셀"],
  ".rm-table td": ["Cellule de tableau (corps)", "Celda de tabla (cuerpo)", "Tabellenzelle (Inhalt)", "Cella di tabella (corpo)", "Célula de tabela (corpo)", "Tabelcel (inhoud)", "Ячейка таблицы (тело)", "表格单元格（正文）", "表のセル（本体）", "표 셀(본문)"],
  ".rm-table__cell": ["Cellule de tableau", "Celda de tabla", "Tabellenzelle", "Cella di tabella", "Célula de tabela", "Tabelcel", "Ячейка таблицы", "表格单元格", "表のセル", "표 셀"],
  ".rm-heading-level-1": ["Titre de niveau 1 / en-tête H1", "Encabezado 1 / título H1", "Überschrift 1", "Intestazione 1 / titolo H1", "Título 1 / cabeçalho H1", "Kop 1", "Заголовок 1", "一级标题", "見出し1", "제목 1"],
  ".rm-heading-level-2": ["Titre de niveau 2 / en-tête H2", "Encabezado 2 / título H2", "Überschrift 2", "Intestazione 2 / titolo H2", "Título 2 / cabeçalho H2", "Kop 2", "Заголовок 2", "二级标题", "見出し2", "제목 2"],
  ".rm-heading-level-3": ["Titre de niveau 3 / en-tête H3", "Encabezado 3 / título H3", "Überschrift 3", "Intestazione 3 / titolo H3", "Título 3 / cabeçalho H3", "Kop 3", "Заголовок 3", "三级标题", "見出し3", "제목 3"],
  ".rm-zoom": ["Fil d'Ariane", "Migas de pan / ruta", "Brotkrumen-Navigation", "Briciole di pane / percorso", "Trilha de navegação", "Broodkruimelpad", "Хлебные крошки / путь", "面包屑导航", "パンくずリスト", "브레드크럼 / 경로"],
  // Blocks & bullets
  ".roam-block-container": ["Bloc avec ses enfants / espacement entre blocs", "Bloque con sus hijos / espaciado", "Block mit Unterblöcken / Abstand", "Blocco con i figli / spaziatura", "Bloco com filhos / espaçamento", "Blok met kinderen / ruimte", "Блок с дочерними / интервал", "块（含子块）/ 间距", "ブロック（子を含む）/ 間隔", "블록(하위 포함) / 간격"],
  ".roam-block": ["Texte des blocs / police du texte", "Texto de los bloques / fuente", "Blocktext / Schrift", "Testo dei blocchi / carattere", "Texto dos blocos / fonte", "Bloktekst / lettertype", "Текст блоков / шрифт", "块文本 / 字体", "ブロックの本文 / フォント", "블록 텍스트 / 글꼴"],
  ".rm-block__input": ["Contenu du bloc", "Contenido del bloque", "Blockinhalt", "Contenuto del blocco", "Conteúdo do bloco", "Blokinhoud", "Содержимое блока", "块内容", "ブロックの内容", "블록 내용"],
  "textarea.rm-block-input": ["Zone d'édition / bloc en cours d'édition", "Área de edición", "Bearbeitungsfeld", "Area di modifica", "Área de edição", "Bewerkingsveld", "Поле редактирования", "编辑框", "編集中のテキスト欄", "편집 영역"],
  ".rm-level-1": ["Niveau d'imbrication / profondeur des blocs", "Nivel de anidación", "Verschachtelungsebene", "Livello di annidamento", "Nível de aninhamento", "Nestingniveau", "Уровень вложенности", "嵌套层级", "ネストの深さ", "중첩 수준"],
  ".rm-block-children": ["Blocs enfants / indentation", "Bloques hijos / sangría", "Unterblöcke / Einrückung", "Blocchi figli / rientro", "Blocos filhos / recuo", "Onderliggende blokken / inspringing", "Дочерние блоки / отступ", "子块 / 缩进", "子ブロック / インデント", "하위 블록 / 들여쓰기"],
  ".rm-multibar": ["Ligne verticale / fil des blocs imbriqués", "Línea vertical de los bloques", "Vertikale Verbindungslinie", "Linea verticale dei blocchi", "Linha vertical dos blocos", "Verticale lijn", "Вертикальная линия", "竖线 / 层级线", "縦の線 / スレッド線", "세로선"],
  ".rm-bullet": ["Puce", "Viñeta", "Aufzählungspunkt", "Punto elenco", "Marcador", "Opsommingsteken", "Маркер", "项目符号", "箇条書きの点 / バレット", "글머리 기호"],
  ".rm-bullet__inner": ["Point de la puce", "Punto de la viñeta", "Punkt des Aufzählungszeichens", "Pallino del punto elenco", "Ponto do marcador", "Bolletje", "Точка маркера", "圆点", "バレットの点", "글머리 점"],
  ".rm-caret": ["Flèche de dépliage / chevron", "Flecha de expandir / contraer", "Auf-/Zuklapp-Pfeil", "Freccia di espansione", "Seta de expandir / recolher", "Uitklappijl", "Стрелка сворачивания", "折叠箭头", "折りたたみ矢印", "접기 화살표"],
  ".block-highlight-blue": ["Blocs sélectionnés", "Bloques seleccionados", "Ausgewählte Blöcke", "Blocchi selezionati", "Blocos selecionados", "Geselecteerde blokken", "Выделенные блоки", "选中的块", "選択されたブロック", "선택된 블록"],
  // Inline
  ".rm-page-ref": ["Référence de page / lien", "Referencia de página / enlace", "Seitenreferenz / Link", "Riferimento a pagina / link", "Referência de página / link", "Paginaverwijzing / link", "Ссылка на страницу", "页面引用", "ページ参照", "페이지 참조"],
  ".rm-page-ref--link": ["Lien de page [[ ]] / double crochets", "Enlace de página [[ ]]", "Seitenlink [[ ]]", "Link a pagina [[ ]]", "Link de página [[ ]]", "Paginalink [[ ]]", "Ссылка [[ ]]", "页面链接 [[ ]]", "ページリンク [[ ]]", "페이지 링크 [[ ]]"],
  ".rm-page-ref--tag": ["Tag / étiquette #", "Etiqueta #", "Tag / Schlagwort #", "Tag / etichetta #", "Tag / etiqueta #", "Tag / label #", "Тег #", "标签 #", "タグ #", "태그 #"],
  '.rm-page-ref--tag[data-tag^="prefix"]': ["Tags commençant par… / famille de tags", "Etiquetas que empiezan por…", "Tags, die beginnen mit…", "Tag che iniziano con…", "Tags que começam com…", "Tags die beginnen met…", "Теги, начинающиеся с…", "以…开头的标签", "…で始まるタグ", "…로 시작하는 태그"],
  '[data-link-title^="prefix"] .rm-page-ref--link': ["Liens commençant par… / famille de liens", "Enlaces que empiezan por…", "Links, die beginnen mit…", "Link che iniziano con…", "Links que começam com…", "Links die beginnen met…", "Ссылки, начинающиеся с…", "以…开头的链接", "…で始まるリンク", "…로 시작하는 링크"],
  '[data-link-title="Page"] .rm-page-ref--link': ["Lien vers une page donnée", "Enlace a una página concreta", "Link zu einer bestimmten Seite", "Link a una pagina specifica", "Link para uma página específica", "Link naar een bepaalde pagina", "Ссылка на конкретную страницу", "指向特定页面的链接", "特定のページへのリンク", "특정 페이지 링크"],
  ".roam-block-container[data-page-links*='\"Tag\"'] > .rm-block-main": ["Blocs portant un tag donné / blocs tagués", "Bloques con una etiqueta dada", "Blöcke mit einem bestimmten Tag", "Blocchi con un tag specifico", "Blocos com uma tag específica", "Blokken met een bepaalde tag", "Блоки с определённым тегом", "带特定标签的块", "特定のタグが付いたブロック", "특정 태그가 있는 블록"],
  ".rm-block-ref": ["Référence de bloc (( ))", "Referencia de bloque (( ))", "Blockreferenz (( ))", "Riferimento a blocco (( ))", "Referência de bloco (( ))", "Blokverwijzing (( ))", "Ссылка на блок (( ))", "块引用 (( ))", "ブロック参照 (( ))", "블록 참조 (( ))"],
  ".rm-alias": ["Lien externe / alias", "Enlace externo / alias", "Externer Link / Alias", "Link esterno / alias", "Link externo / alias", "Externe link / alias", "Внешняя ссылка / алиас", "外部链接 / 别名", "外部リンク / エイリアス", "외부 링크 / 별칭"],
  ".rm-bold": ["Gras", "Negrita", "Fett", "Grassetto", "Negrito", "Vet", "Жирный", "粗体", "太字", "굵게"],
  ".rm-italics": ["Italique", "Cursiva", "Kursiv", "Corsivo", "Itálico", "Cursief", "Курсив", "斜体", "斜体", "기울임"],
  ".rm-highlight": ["Surlignage", "Resaltado", "Hervorhebung / Markierung", "Evidenziazione", "Destaque / marca-texto", "Markering", "Выделение цветом", "高亮", "ハイライト", "형광펜 / 강조"],
  ".rm-block-text code": ["Code en ligne", "Código en línea", "Inline-Code", "Codice inline", "Código inline", "Inline code", "Встроенный код", "行内代码", "インラインコード", "인라인 코드"],
  ".rm-code-block": ["Bloc de code", "Bloque de código", "Codeblock", "Blocco di codice", "Bloco de código", "Codeblok", "Блок кода", "代码块", "コードブロック", "코드 블록"],
  ".rm-bq": ["Citation", "Cita", "Zitat", "Citazione", "Citação", "Citaat", "Цитата", "引用块", "引用", "인용문"],
  ".rm-attr-ref": ["Attribut", "Atributo", "Attribut", "Attributo", "Atributo", "Attribuut", "Атрибут", "属性", "属性", "속성"],
  ".check-container": ["Case à cocher / TODO", "Casilla de verificación / TODO", "Kontrollkästchen / TODO", "Casella di controllo / TODO", "Caixa de seleção / TODO", "Selectievakje / TODO", "Флажок / чекбокс", "复选框", "チェックボックス", "체크박스"],
  ".rm-embed-container": ["Bloc intégré / embed", "Bloque incrustado", "Eingebetteter Block", "Blocco incorporato", "Bloco incorporado", "Ingesloten blok", "Встроенный блок", "嵌入块", "埋め込みブロック", "임베드 블록"],
  ".rm-inline-img": ["Image", "Imagen", "Bild", "Immagine", "Imagem", "Afbeelding", "Изображение", "图片", "画像", "이미지"],
  // References & queries
  ".rm-reference-wrapper > .rm-reference-main": ["Références liées", "Referencias vinculadas", "Verknüpfte Referenzen", "Riferimenti collegati", "Referências vinculadas", "Gekoppelde verwijzingen", "Связанные ссылки", "关联引用", "リンクされた参照", "연결된 참조"],
  ".rm-mentions": ["Références non liées", "Referencias no vinculadas", "Nicht verknüpfte Referenzen", "Riferimenti non collegati", "Referências não vinculadas", "Niet-gekoppelde verwijzingen", "Несвязанные упоминания", "未关联引用", "リンクされていない参照", "연결되지 않은 참조"],
  ".rm-query": ["Requête", "Consulta", "Abfrage", "Query / interrogazione", "Consulta", "Query / zoekopdracht", "Запрос", "查询", "クエリ", "쿼리"],
  // Tables & kanban
  ".roam-table": ["Tableau", "Tabla", "Tabelle", "Tabella", "Tabela", "Tabel", "Таблица", "表格", "テーブル / 表", "표"],
  ".rm-data-table__table": ["Tableau de requête datalog / Datomic", "Tabla de consulta datalog / Datomic", "Datalog-Abfragetabelle / Datomic", "Tabella di query datalog / Datomic", "Tabela de consulta datalog / Datomic", "Datalog-querytabel / Datomic", "Таблица запроса datalog / Datomic", "Datalog 查询表格", "Datalog クエリの表", "Datalog 쿼리 표"],
  ".rm-data-table__table th": ["En-tête de tableau de requête datalog", "Encabezado de tabla datalog", "Kopfzelle der Datalog-Tabelle", "Intestazione tabella datalog", "Cabeçalho da tabela datalog", "Kop van datalog-tabel", "Заголовок таблицы datalog", "Datalog 表格表头", "Datalog 表の見出し", "Datalog 표 머리글"],
  ".rm-data-table__table td": ["Cellule de tableau de requête datalog", "Celda de tabla datalog", "Zelle der Datalog-Tabelle", "Cella tabella datalog", "Célula da tabela datalog", "Cel van datalog-tabel", "Ячейка таблицы datalog", "Datalog 表格单元格", "Datalog 表のセル", "Datalog 표 셀"],
  ".kanban-board": ["Tableau kanban", "Tablero kanban", "Kanban-Board", "Bacheca kanban", "Quadro kanban", "Kanbanbord", "Канбан-доска", "看板", "カンバンボード", "칸반 보드"],
  // Dialogs & menus
  ".bp3-dialog": ["Boîte de dialogue / fenêtre modale", "Cuadro de diálogo / ventana modal", "Dialogfenster", "Finestra di dialogo", "Caixa de diálogo", "Dialoogvenster", "Диалоговое окно", "对话框", "ダイアログ", "대화 상자"],
  ".bp3-popover": ["Popover / aperçu flottant", "Ventana emergente / vista previa", "Popover / Vorschau", "Popover / finestra a comparsa", "Popover / janela flutuante", "Popover / pop-up", "Всплывающее окно", "弹出层", "ポップオーバー", "팝오버"],
  ".bp3-menu": ["Menu contextuel", "Menú contextual", "Kontextmenü", "Menu contestuale", "Menu de contexto", "Contextmenu", "Контекстное меню", "菜单", "メニュー", "메뉴"],
  ".rm-autocomplete__results": ["Autocomplétion / suggestions", "Autocompletado / sugerencias", "Autovervollständigung", "Completamento automatico", "Autocompletar / sugestões", "Automatisch aanvullen", "Автодополнение", "自动补全", "オートコンプリート", "자동 완성"],
  ".bp3-menu-item": ["Élément de menu / entrée de menu", "Elemento de menú", "Menüeintrag", "Voce di menu", "Item de menu", "Menu-item", "Пункт меню", "菜单项", "メニュー項目", "메뉴 항목"],
  ".bp3-tooltip .bp3-popover-content": ["Infobulle", "Tooltip / información emergente", "Tooltip / Kurzinfo", "Tooltip / suggerimento", "Dica de ferramenta / tooltip", "Tooltip / knopinfo", "Всплывающая подсказка", "工具提示", "ツールチップ", "툴팁"],
  // Buttons & form controls
  ".bp3-button": ["Bouton", "Botón", "Schaltfläche / Button", "Pulsante", "Botão", "Knop", "Кнопка", "按钮", "ボタン", "버튼"],
  ".bp3-button.bp3-minimal": ["Bouton icône / bouton discret", "Botón de icono", "Symbolschaltfläche", "Pulsante icona", "Botão de ícone", "Pictogramknop", "Кнопка-значок", "图标按钮", "アイコンボタン", "아이콘 버튼"],
  ".bp3-html-select select": ["Liste déroulante / sélecteur / select", "Lista desplegable / selector", "Auswahlliste / Dropdown", "Menu a tendina / selettore", "Lista suspensa / seletor", "Keuzelijst / dropdown", "Выпадающий список", "下拉选择框", "ドロップダウン / セレクト", "드롭다운 / 선택 상자"],
  ".bp3-input": ["Champ de saisie / champ texte", "Campo de texto", "Eingabefeld / Textfeld", "Campo di testo", "Campo de texto", "Invoerveld / tekstveld", "Поле ввода", "文本输入框", "テキスト入力欄", "텍스트 입력란"],
  ".bp3-control .bp3-control-indicator": ["Case à cocher (dialogues) / bouton radio", "Casilla de verificación (diálogos)", "Kontrollkästchen (Dialoge)", "Casella di controllo (finestre)", "Caixa de seleção (diálogos)", "Selectievakje (dialoogvensters)", "Флажок (диалоги)", "复选框（对话框）", "チェックボックス（ダイアログ）", "체크박스(대화 상자)"],
  ".bp3-control.bp3-switch .bp3-control-indicator": ["Interrupteur / bouton bascule", "Interruptor", "Schalter / Umschalter", "Interruttore", "Interruptor / alternador", "Schakelaar", "Переключатель", "开关", "スイッチ / トグル", "스위치 / 토글"],
  ".bp3-tab": ["Onglet", "Pestaña", "Registerkarte / Tab", "Scheda", "Aba / guia", "Tabblad", "Вкладка", "标签页", "タブ", "탭"],
  // Misc
  ".rm-streak": ["Série / grille d'activité (streak)", "Racha / cuadrícula de actividad", "Serie / Aktivitätsraster (Streak)", "Serie / griglia di attività", "Sequência / grade de atividade", "Reeks / activiteitenraster", "Серия / сетка активности", "连续记录 / 活动网格", "連続記録 / アクティビティグリッド", "연속 기록 / 활동 그리드"],
  "::-webkit-scrollbar": ["Barres de défilement", "Barras de desplazamiento", "Scrollleisten", "Barre di scorrimento", "Barras de rolagem", "Schuifbalken", "Полосы прокрутки", "滚动条", "スクロールバー", "스크롤바"],
  ".rm-dark-theme": ["Mode sombre", "Modo oscuro", "Dunkelmodus", "Modalità scura", "Modo escuro", "Donkere modus", "Тёмная тема", "深色模式", "ダークモード", "다크 모드"],
};

export const getTranslations = (selector) => TRANSLATIONS[selector] || [];

// Language of the UI (two-letter code), used to show the translated name.
export const getUiLang = () => {
  const lang = (typeof navigator !== "undefined" && navigator.language) || "en";
  return lang.slice(0, 2).toLowerCase();
};

export const getLocalizedName = (selector, lang = getUiLang()) => {
  const i = LANGS.indexOf(lang);
  if (i < 0) return null;
  return (TRANSLATIONS[selector] || [])[i] || null;
};
