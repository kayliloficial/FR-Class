// ===== CONTENT: edit or add phrases here =====
// ---------- Content: edit or add phrases here ----------
// [id, French, pronunciation, English]
const DATA = {
  'Greetings': [
    ['g1','Bonjour','bon-ZHOOR','Hello / Good day'],
    ['g2','Bonsoir','bon-SWAHR','Good evening'],
    ['g3','Salut','sa-LOO','Hi (informal)'],
    ['g4','Au revoir','oh ruh-VWAHR','Goodbye'],
    ['g5','Bonne journée','bon zhoor-NAY','Have a nice day'],
    ['g6','Merci','mer-SEE','Thank you'],
    ['g7','S\'il vous plaît','seel voo PLEH','Please'],
    ['g8','Enchanté(e)','on-shon-TAY','Nice to meet you'],
  ],
  'Welcoming guests': [
    ['w1','Bienvenue !','bee-en-vuh-NOO','Welcome!'],
    ['w2','Une table pour combien ?','oon TAH-bluh poor kom-bee-EN','A table for how many?'],
    ['w3','Par ici, s\'il vous plaît','par ee-SEE seel voo PLEH','This way, please'],
    ['w4','Avez-vous réservé ?','ah-vay voo ray-zer-VAY','Do you have a reservation?'],
    ['w5','Voici la carte','vwah-SEE lah KART','Here is the menu'],
    ['w6','Je suis à votre service','zhuh swee ah VO-truh ser-VEESS','I\'m at your service'],
  ],
  'Taking orders': [
    ['o1','Vous désirez ?','voo day-zee-RAY','What would you like?'],
    ['o2','Je vous recommande…','zhuh voo ruh-ko-MOND','I recommend…'],
    ['o3','Comme boisson ?','kom bwah-SON','To drink?'],
    ['o4','Voulez-vous un dessert ?','voo-lay voo un day-SEHR','Would you like a dessert?'],
    ['o5','Une carafe d\'eau','oon ka-RAF DOH','A jug of tap water'],
    ['o6','L\'addition, s\'il vous plaît','la-dee-see-ON seel voo PLEH','The bill, please'],
    ['o7','Bon appétit !','bon ah-pay-TEE','Enjoy your meal!'],
  ],
  'Menu words': [
    ['m1','Le pain','luh PAN','Bread'],
    ['m2','Le fromage','luh fro-MAZH','Cheese'],
    ['m3','Le poulet','luh poo-LAY','Chicken'],
    ['m4','Le poisson','luh pwah-SON','Fish'],
    ['m5','Le vin rouge','luh van ROOZH','Red wine'],
    ['m6','L\'eau','LOH','Water'],
    ['m7','Le café','luh ka-FAY','Coffee'],
    ['m8','Le sel / Le poivre','luh SEL / luh PWAH-vruh','Salt / Pepper'],
  ],
};
const ALL = Object.values(DATA).flat();

const ICONS = { 'Greetings':'👋','Welcoming guests':'🍽️','Taking orders':'📝','Menu words':'🥖' };

// Simulations: [customer FR, customer EN, [[correct FR, EN], [wrong FR, EN], [wrong FR, EN]], tip]
const SIM = [
  { title:'Welcome a guest', emoji:'🕯️', steps:[
    ['Bonsoir, nous avons réservé une table pour deux.','Good evening, we booked a table for two.',
      [['Bonsoir ! Par ici, s\'il vous plaît.','Good evening! This way, please.'],['Au revoir !','Goodbye!'],['L\'addition, s\'il vous plaît.','The bill, please.']],'Greet first, then guide them: "Par ici".'],
    ['Pouvons-nous avoir la carte, s\'il vous plaît ?','Could we have the menu, please?',
      [['Bien sûr, voici la carte.','Of course, here is the menu.'],['Merci, bonne journée !','Thanks, have a nice day!'],['Une carafe d\'eau.','A jug of water.']],'"Voici" = "here is".'],
    ['Qu\'est-ce que vous recommandez ?','What do you recommend?',
      [['Je vous recommande le poulet.','I recommend the chicken.'],['Bonsoir !','Good evening!'],['Le sel et le poivre.','Salt and pepper.']],'"Je vous recommande…" is the key phrase.'],
    ['Je vais prendre le poisson, s\'il vous plaît.','I\'ll have the fish, please.',
      [['Très bien. Et comme boisson ?','Very good. And to drink?'],['Bienvenue !','Welcome!'],['Au revoir !','Goodbye!']],'After the food order, ask about drinks.'] ]},
  { title:'Bill and goodbye', emoji:'💳', steps:[
    ['Le repas était délicieux !','The meal was delicious!',
      [['Merci beaucoup ! Voulez-vous un café ?','Thank you! Would you like a coffee?'],['Par ici, s\'il vous plaît.','This way, please.'],['Avez-vous réservé ?','Do you have a reservation?']],'Thank them, then offer coffee or dessert.'],
    ['L\'addition, s\'il vous plaît.','The bill, please.',
      [['Tout de suite, je vous l\'apporte.','Right away, I\'ll bring it.'],['Bienvenue !','Welcome!'],['Une table pour combien ?','A table for how many?']],'"Tout de suite" = right away.'],
    ['Est-ce qu\'on peut payer par carte ?','Can we pay by card?',
      [['Oui, bien sûr.','Yes, of course.'],['Le vin rouge.','The red wine.'],['Bonjour !','Hello!']],'"Bien sûr" = of course.'],
    ['Merci, au revoir !','Thank you, goodbye!',
      [['Merci à vous, bonne soirée !','Thank you, have a nice evening!'],['Bienvenue !','Welcome!'],['Voici la carte.','Here is the menu.']],'"Bonne soirée" is the evening goodbye.'] ]},
];