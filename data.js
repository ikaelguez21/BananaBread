import React from 'react';

// --- ICONS ---
export const Icons = {
    Loader: ({size=24}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
    Trash2: ({size=14}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>,
    Pencil: ({size=14}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>,
    AlertCircle: ({size=12, className}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>,
    Save: ({size=18}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
    Check: ({size=14, className}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className || "text-white"}><polyline points="20 6 9 17 4 12"/></svg>,
    PlusCircle: ({size=20}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="16"/><line x1="8" x2="16" y1="12" y2="12"/></svg>,
    Refresh: ({size=16}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
    GitBranch: ({size=16}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg>,
    Eye: ({size=16}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8-11-8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
    EyeOff: ({size=16}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>,
    ChevronDown: ({size=16, className}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="6 9 12 15 18 9"></polyline></svg>,
    ChevronUp: ({size=16, className}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="18 15 12 9 6 15"></polyline></svg>,
    Download: ({size=16}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
    Upload: ({size=16}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>,
    Fire: ({size=12}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none" className="text-orange-500"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.1.2-2.2.6-3.3.3.9.9 1.8 1.9 2.8z"/></svg>,
    BookOpen: ({size=20}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
    Plus: ({size=20}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>,
    Search: ({size=16}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
    Sun: ({size=16}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>,
    Moon: ({size=16}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>,
};

// --- FACULTY DATA ---
// All tracks now reference 'completeTrack.csv'
export const FACULTY_DATA = {
    "הנדסת חשמל ומחשבים": [
        { id: "completeTrack.csv:Electrical Engineering", name: "הנדסת חשמל" }, 
        { id: "completeTrack.csv:Electrical Engineering and Mathematics", name: "הנדסת חשמל ומתמטיקה" }, 
        { id: "completeTrack.csv:Electrical and Computer Engineering", name: "הנדסת חשמל ומחשבים" }, 
        { id: "completeTrack.csv:Electrical Engineering and Physics", name: "הנדסת חשמל ופיזיקה" }, 
        { id: "completeTrack.csv:Combined Electrical Engineering and Physics", name: "הנדסת חשמל ופיזיקה (משולב)" }, 
        { id: "completeTrack.csv:Computer Engineering", name: "הנדסת מחשבים" }
    ],
    "מדעי המחשב": [
        { id: "completeTrack.csv:Computer Science - General Four-Year Track", name: "מדעי המחשב (כללי 4 שנתי)" }, 
        { id: "completeTrack.csv:Computer Science and Computer Systems - Cyber Security Track", name: "סייבר ואבטחת מידע" }, 
        { id: "completeTrack.csv:Computer Science - General Three-Year Track", name: "מדעי המחשב (כללי 3 שנתי)" }, 
        { id: "completeTrack.csv:Computer Science - Learning and Data Analysis Track", name: "למידה וניתוח מידע" }, 
        { id: "completeTrack.csv:Computer Science - Bioinformatics Track", name: "ביואינפורמטיקה" }, 
        { id: "completeTrack.csv:Software Engineering Track", name: "הנדסת תוכנה" }, 
        { id: "completeTrack.csv:Computer Engineering Track", name: "הנדסת מחשבים (מדמ\"ח)" }, 
        { id: "completeTrack.csv:Computer Science and Mathematics - Combined Track", name: "מדעי המחשב ומתמטיקה" }, 
        { id: "completeTrack.csv:Computer Science and Physics - Combined Track", name: "מדעי המחשב ופיזיקה" }, 
        { id: "completeTrack.csv:Medicine and Computer Science - Double Degree Track", name: "רפואה ומדעי המחשב" }
    ],
    "הנדסת מכונות": [
        { id: "completeTrack.csv:Mechanical Engineering", name: "הנדסת מכונות" }, 
        { id: "completeTrack.csv:BRAKIM", name: "ברקים (מצוינות)" }
    ],
    "הנדסה אזרחית וסביבתית": [
        { id: "completeTrack.csv:Civil Engineering - Water & Environment", name: "הנדסה אזרחית - מים וסביבה" }, 
        { id: "completeTrack.csv:Civil Engineering - Transportation", name: "הנדסה אזרחית - תחבורה" }, 
        { id: "completeTrack.csv:Civil Engineering", name: "הנדסה אזרחית (כללי/מבנים)" }, 
        { id: "completeTrack.csv:Civil Engineering - Management and Construction", name: "ניהול ובנייה" }, 
        { id: "completeTrack.csv:Environmental Engineering", name: "הנדסת סביבה" }, 
        { id: "completeTrack.csv:Mapping and Geo-Information Engineering", name: "מיפוי וגיאו-אינפורמציה" }, 
        { id: "completeTrack.csv:Mapping and Geo-Information 3Y Engineering", name: "מיפוי וגיאו-אינפורמציה (3 שנתי)" }
    ],
    "הנדסת תעשייה וניהול": [
        { id: "completeTrack.csv:Data and Information Engineering", name: "הנדסת נתונים ומידע" }, 
        { id: "completeTrack.csv:Industrial Engineering and Management", name: "הנדסת תעשייה וניהול" }, 
        { id: "completeTrack.csv:Information Systems Engineering", name: "מערכות מידע" }, 
        { id: "completeTrack.csv:Medicine and Data Engineering", name: "רפואה והנדסת נתונים" }
    ],
    "הנדסת אווירונאוטיקה וחלל": [
        { id: "completeTrack.csv:Aeronautics and Astronautics", name: "הנדסת אווירונאוטיקה" }, 
        { id: "completeTrack.csv:Aeronautics and Physics", name: "אווירונאוטיקה ופיזיקה" }
    ],
    "הנדסה כימית": [
        { id: "completeTrack.csv:Chemical Engineering", name: "הנדסה כימית" }, 
        { id: "completeTrack.csv:Biochemical Engineering", name: "הנדסה ביוכימית" }
    ],
    "הנדסת ביוטכנולוגיה ומזון": [
        { id: "completeTrack.csv:Biotechnology and Food Engineering", name: "הנדסת ביוטכנולוגיה ומזון" }
    ],
    "הנדסה ביו-רפואית": [
        { id: "completeTrack.csv:Biomedical Engineering", name: "הנדסה ביו-רפואית" }, 
        { id: "completeTrack.csv:Biomedical Engineering and Physics", name: "ביו-רפואה ופיזיקה" }, 
        { id: "completeTrack.csv:Medicine and Biomedical Engineering", name: "רפואה והנדסה ביו-רפואית" }
    ],
    "הנדסת חומרים": [
        { id: "completeTrack.csv:Materials Engineering", name: "הנדסת חומרים" }, 
        { id: "completeTrack.csv:Materials Engineering and Physics", name: "הנדסת חומרים ופיזיקה" }, 
        { id: "completeTrack.csv:Materials Engineering and Chemistry", name: "הנדסת חומרים וכימיה" }, 
        { id: "completeTrack.csv:Materials Engineering and Biology", name: "הנדסת חומרים וביולוגיה" }
    ],
    "ארכיטקטורה ובינוי ערים": [
        { id: "completeTrack.csv:Architecture and Town Planning", name: "ארכיטקטורה" }
    ],
    "מתמטיקה": [
        { id: "completeTrack.csv:Three-year program in Mathematics", name: "מתמטיקה (3 שנתי)" }, 
        { id: "completeTrack.csv:Combined Mathematics-Physics", name: "מתמטיקה ופיזיקה (משולב)" }, 
        { id: "completeTrack.csv:Mathematics with Computer Science", name: "מתמטיקה עם מדעי המחשב" }, 
        { id: "completeTrack.csv:Applied Mathematics", name: "מתמטיקה שימושית" }, 
        { id: "completeTrack.csv:Computer Science and Mathematics", name: "מדעי המחשב ומתמטיקה" }
    ],
    "פיזיקה": [
        { id: "completeTrack.csv:Physics - Three-Year Track", name: "פיזיקה (3 שנתי)" }, 
        { id: "completeTrack.csv:Physics - Four-Year Track", name: "פיזיקה (4 שנתי)" }, 
        { id: "completeTrack.csv:Mathematics and Physics - Combined Three-Year Track", name: "מתמטיקה ופיזיקה (3 שנתי)" }, 
        { id: "completeTrack.csv:Physics - Electrical and Computer Engineering Track", name: "פיזיקה - מגמת הנדסת חשמל" }, 
        { id: "completeTrack.csv:Physics and Electrical Engineering - Combined Track", name: "פיזיקה והנדסת חשמל (משולב)" }, 
        { id: "completeTrack.csv:Computer Science and Physics - Combined Degree Track", name: "מדעי המחשב ופיזיקה (משולב)" }, 
        { id: "completeTrack.csv:Biomedical Engineering and Physics - Combined Degree Track", name: "הנדסה ביו-רפואית ופיזיקה" }, 
        { id: "completeTrack.csv:Aerospace Engineering and Physics - Combined Degree Track", name: "אווירונאוטיקה ופיזיקה" }
    ],
    "כימיה": [
        { id: "completeTrack.csv:Chemistry", name: "כימיה" }, 
        { id: "completeTrack.csv:Haznek Chemistry - Medicinal", name: "כימיה - מזנק (רפואית)" }, 
        { id: "completeTrack.csv:Haznek Chemistry - Technologies", name: "כימיה - מזנק (טכנולוגיות)" }, 
        { id: "completeTrack.csv:Haznek Chemistry - Quantum", name: "כימיה - מזנק (קוונטים)" }, 
        { id: "completeTrack.csv:Molecular Biochemistry", name: "ביוכימיה מולקולרית" }
    ],
    "ביולוגיה": [
        { id: "completeTrack.csv:Biology", name: "ביולוגיה" }, 
        { id: "completeTrack.csv:Biology - Research and Human Development", name: "ביולוגיה - מחקר והתפתחות האדם" }, 
        { id: "completeTrack.csv:Biology - Microbiology Ecology and Environment", name: "ביולוגיה - מיקרוביולוגיה ואקולוגיה" }, 
        { id: "completeTrack.csv:Biology - Research in Biology and Molecular Biochemistry", name: "ביולוגיה - ביוכימיה מולקולרית" }, 
        { id: "completeTrack.csv:Double Major in Biology and Chemistry", name: "ביולוגיה וכימיה (דו-חוגי)" }
    ],
    "רפואה": [
        { id: "completeTrack.csv:Medical Sciences", name: "מדעי הרפואה" }, 
        { id: "completeTrack.csv:Medicine and Biomedical Engineering", name: "רפואה והנדסה ביו-רפואית" }, 
        { id: "completeTrack.csv:Medicine and Computer Science - Double Degree Track", name: "רפואה ומדעי המחשב" }
    ],
    "חינוך למדע וטכנולוגיה": [
        { id: "completeTrack.csv:Mathematics Education", name: "הוראת המתמטיקה" }, 
        { id: "completeTrack.csv:Physics Education", name: "הוראת הפיזיקה" }, 
        { id: "completeTrack.csv:Chemistry Education", name: "הוראת הכימיה" }, 
        { id: "completeTrack.csv:Biology-Environmental Sciences Education", name: "הוראת הביולוגיה ומדעי הסביבה" }, 
        { id: "completeTrack.csv:Computer Science Education", name: "הוראת מדעי המחשב" }, 
        { id: "completeTrack.csv:Technology-Mechanical Education", name: "הוראת טכנולוגיה-מכונות" }, 
        { id: "completeTrack.csv:Electronics-Electricity Education", name: "הוראת חשמל ואלקטרוניקה" }
    ]
};