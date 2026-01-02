const facultyData = {
  'הנדסת חשמל ומחשבים': [
    {
      id: 'electricalEngTracks.csv:Electrical Engineering',
      name: 'הנדסת חשמל'
    },
    {
      id: 'electricalEngTracks.csv:Electrical Engineering and Mathematics',
      name: 'הנדסת חשמל ומתמטיקה'
    },
    {
      id: 'electricalEngTracks.csv:Electrical and Computer Engineering',
      name: 'הנדסת חשמל ומחשבים'
    },
    {
      id: 'electricalEngTracks.csv:Electrical Engineering and Physics',
      name: 'הנדסת חשמל ופיזיקה'
    },
    {
      id: 'electricalEngTracks.csv:Combined Electrical Engineering and Physics',
      name: 'הנדסת חשמל ופיזיקה (משולב)'
    },
    { id: 'electricalEngTracks.csv:Computer Engineering', name: 'הנדסת מחשבים' }
  ],
  'מדעי המחשב': [
    {
      id: 'csTracks.csv:Computer Science - General Four-Year Track',
      name: 'מדעי המחשב (כללי 4 שנתי)'
    },
    {
      id: 'csTracks.csv:Computer Science and Computer Systems - Cyber Security Track',
      name: 'סייבר ואבטחת מידע'
    },
    {
      id: 'csTracks.csv:Computer Science - General Three-Year Track',
      name: 'מדעי המחשב (כללי 3 שנתי)'
    },
    {
      id: 'csTracks.csv:Computer Science - Learning and Data Analysis Track',
      name: 'למידה וניתוח מידע'
    },
    {
      id: 'csTracks.csv:Computer Science - Bioinformatics Track',
      name: 'ביואינפורמטיקה'
    },
    {
      id: 'csTracks.csv:Software Engineering Track',
      name: 'הנדסת תוכנה'
    },
    {
      id: 'csTracks.csv:Computer Engineering Track',
      name: 'הנדסת מחשבים (מדמ"ח)'
    },
    {
      id: 'csTracks.csv:Computer Science and Mathematics - Combined Track',
      name: 'מדעי המחשב ומתמטיקה'
    },
    {
      id: 'csTracks.csv:Computer Science and Physics - Combined Track',
      name: 'מדעי המחשב ופיזיקה'
    },
    {
      id: 'csTracks.csv:Medicine and Computer Science - Double Degree Track',
      name: 'רפואה ומדעי המחשב'
    }
  ],
  'הנדסת מכונות': [
    {
      id: 'mechEngTracks.csv:Mechanical Engineering',
      name: 'הנדסת מכונות'
    },
    { id: 'mechEngTracks.csv:BRAKIM', name: 'ברקים (מצוינות)' }
  ],
  'הנדסה אזרחית וסביבתית': [
    {
      id: 'civilEngTracks.csv:Civil Engineering - Water & Environment',
      name: 'הנדסה אזרחית - מים וסביבה'
    },
    {
      id: 'civilEngTracks.csv:Civil Engineering - Transportation',
      name: 'הנדסה אזרחית - תחבורה'
    },
    {
      id: 'civilEngTracks.csv:Civil Engineering',
      name: 'הנדסה אזרחית (כללי/מבנים)'
    },
    {
      id: 'civilEngTracks.csv:Civil Engineering - Management and Construction',
      name: 'ניהול ובנייה'
    },
    {
      id: 'civilEngTracks.csv:Environmental Engineering',
      name: 'הנדסת סביבה'
    },
    {
      id: 'civilEngTracks.csv:Mapping and Geo-Information Engineering',
      name: 'מיפוי וגיאו-אינפורמציה'
    },
    {
      id: 'civilEngTracks.csv:Mapping and Geo-Information 3Y Engineering',
      name: 'מיפוי וגיאו-אינפורמציה (3 שנתי)'
    }
  ],
  'הנדסת תעשייה וניהול': [
    {
      id: 'dataDecisionTracks.csv:Data and Information Engineering',
      name: 'הנדסת נתונים ומידע'
    },
    {
      id: 'dataDecisionTracks.csv:Industrial Engineering and Management',
      name: 'הנדסת תעשייה וניהול'
    },
    {
      id: 'dataDecisionTracks.csv:Information Systems Engineering',
      name: 'מערכות מידע'
    },
    { id: 'dataDecisionTracks.csv:Medicine and Data Engineering', name: 'רפואה והנדסת נתונים' }
  ],
  'הנדסת אווירונאוטיקה וחלל': [
    {
      id: 'aerospaceTracks.csv:Aeronautics and Astronautics',
      name: 'הנדסת אווירונאוטיקה'
    },
    { id: 'aerospaceTracks.csv:Aeronautics and Physics', name: 'אווירונאוטיקה ופיזיקה' }
  ],
  'הנדסה כימית': [
    {
      id: 'chemicalEngTracks.csv:Chemical Engineering',
      name: 'הנדסה כימית'
    },
    { id: 'chemicalEngTracks.csv:Biochemical Engineering', name: 'הנדסה ביוכימית' }
  ],
  'הנדסת ביוטכנולוגיה ומזון': [
    {
      id: 'biotechFoodTracks.csv:Biotechnology and Food Engineering',
      name: 'הנדסת ביוטכנולוגיה ומזון'
    }
  ],
  'הנדסה ביו-רפואית': [
    {
      id: 'biomedicalTracks.csv:Biomedical Engineering',
      name: 'הנדסה ביו-רפואית'
    },
    {
      id: 'biomedicalTracks.csv:Biomedical Engineering and Physics',
      name: 'ביו-רפואה ופיזיקה'
    },
    {
      id: 'biomedicalTracks.csv:Medicine and Biomedical Engineering',
      name: 'רפואה והנדסה ביו-רפואית'
    }
  ],
  'הנדסת חומרים': [
    {
      id: 'materialsTracks.csv:Materials Engineering',
      name: 'הנדסת חומרים'
    },
    {
      id: 'materialsTracks.csv:Materials Engineering and Physics',
      name: 'הנדסת חומרים ופיזיקה'
    },
    {
      id: 'materialsTracks.csv:Materials Engineering and Chemistry',
      name: 'הנדסת חומרים וכימיה'
    },
    { id: 'materialsTracks.csv:Materials Engineering and Biology', name: 'הנדסת חומרים וביולוגיה' }
  ],
  'ארכיטקטורה ובינוי ערים': [
    { id: 'architectureTracks.csv:Architecture and Town Planning', name: 'ארכיטקטורה' }
  ],
  מתמטיקה: [
    {
      id: 'mathTracks.csv:Three-year program in Mathematics',
      name: 'מתמטיקה (3 שנתי)'
    },
    {
      id: 'mathTracks.csv:Combined Mathematics-Physics',
      name: 'מתמטיקה ופיזיקה (משולב)'
    },
    {
      id: 'mathTracks.csv:Mathematics with Computer Science',
      name: 'מתמטיקה עם מדעי המחשב'
    },
    {
      id: 'mathTracks.csv:Applied Mathematics',
      name: 'מתמטיקה שימושית'
    },
    { id: 'mathTracks.csv:Computer Science and Mathematics', name: 'מדעי המחשב ומתמטיקה' }
  ],
  פיזיקה: [
    {
      id: 'physicsTracks.csv:Physics - Three-Year Track',
      name: 'פיזיקה (3 שנתי)'
    },
    {
      id: 'physicsTracks.csv:Physics - Four-Year Track',
      name: 'פיזיקה (4 שנתי)'
    },
    {
      id: 'physicsTracks.csv:Mathematics and Physics - Combined Three-Year Track',
      name: 'מתמטיקה ופיזיקה (3 שנתי)'
    },
    {
      id: 'physicsTracks.csv:Physics - Electrical and Computer Engineering Track',
      name: 'פיזיקה - מגמת הנדסת חשמל'
    },
    {
      id: 'physicsTracks.csv:Physics and Electrical Engineering - Combined Track',
      name: 'פיזיקה והנדסת חשמל (משולב)'
    },
    {
      id: 'physicsTracks.csv:Computer Science and Physics - Combined Degree Track',
      name: 'מדעי המחשב ופיזיקה (משולב)'
    },
    {
      id: 'physicsTracks.csv:Biomedical Engineering and Physics - Combined Degree Track',
      name: 'הנדסה ביו-רפואית ופיזיקה'
    },
    {
      id: 'physicsTracks.csv:Aerospace Engineering and Physics - Combined Degree Track',
      name: 'אווירונאוטיקה ופיזיקה'
    }
  ],
  כימיה: [
    {
      id: 'chemistryTracks.csv:Chemistry',
      name: 'כימיה'
    },
    {
      id: 'chemistryTracks.csv:Haznek Chemistry - Medicinal',
      name: 'כימיה - מזנק (רפואית)'
    },
    {
      id: 'chemistryTracks.csv:Haznek Chemistry - Technologies',
      name: 'כימיה - מזנק (טכנולוגיות)'
    },
    {
      id: 'chemistryTracks.csv:Haznek Chemistry - Quantum',
      name: 'כימיה - מזנק (קוונטים)'
    },
    { id: 'chemistryTracks.csv:Molecular Biochemistry', name: 'ביוכימיה מולקולרית' }
  ],
  ביולוגיה: [
    {
      id: 'biologyTracks.csv:Biology',
      name: 'ביולוגיה'
    },
    {
      id: 'biologyTracks.csv:Biology - Research and Human Development',
      name: 'ביולוגיה - מחקר והתפתחות האדם'
    },
    {
      id: 'biologyTracks.csv:Biology - Microbiology Ecology and Environment',
      name: 'ביולוגיה - מיקרוביולוגיה ואקולוגיה'
    },
    {
      id: 'biologyTracks.csv:Biology - Research in Biology and Molecular Biochemistry',
      name: 'ביולוגיה - ביוכימיה מולקולרית'
    },
    {
      id: 'biologyTracks.csv:Double Major in Biology and Chemistry',
      name: 'ביולוגיה וכימיה (דו-חוגי)'
    }
  ],
  רפואה: [
    {
      id: 'medicineTracks.csv:Medical Sciences',
      name: 'מדעי הרפואה'
    },
    {
      id: 'medicineTracks.csv:Medicine and Biomedical Engineering',
      name: 'רפואה והנדסה ביו-רפואית'
    },
    {
      id: 'medicineTracks.csv:Medicine and Computer Science - Double Degree Track',
      name: 'רפואה ומדעי המחשב'
    }
  ],
  'חינוך למדע וטכנולוגיה': [
    {
      id: 'educationTracks.csv:Mathematics Education',
      name: 'הוראת המתמטיקה'
    },
    {
      id: 'educationTracks.csv:Physics Education',
      name: 'הוראת הפיזיקה'
    },
    {
      id: 'educationTracks.csv:Chemistry Education',
      name: 'הוראת הכימיה'
    },
    {
      id: 'educationTracks.csv:Biology-Environmental Sciences Education',
      name: 'הוראת הביולוגיה ומדעי הסביבה'
    },
    {
      id: 'educationTracks.csv:Computer Science Education',
      name: 'הוראת מדעי המחשב'
    },
    {
      id: 'educationTracks.csv:Technology-Mechanical Education',
      name: 'הוראת טכנולוגיה-מכונות'
    },
    { id: 'educationTracks.csv:Electronics-Electricity Education', name: 'הוראת חשמל ואלקטרוניקה' }
  ]
};

export default facultyData;
