-- Seed data ported 1:1 from the design prototype's MENU / REWARDS constants.

insert into menu_items (id, cat, name, name_fr, description, description_fr, price, add_ons, sort_order) values
('co1','combo','Combo Classique','Combo Classique','Classic Sanj burger, fries and a soft drink.','Burger Classic Sanj, frites et une boisson.',5500,'[]',1),
('co2','combo','Combo Smoke Stack','Combo Smoke Stack','Smoke Stack burger, fries and a soft drink.','Burger Smoke Stack, frites et une boisson.',6500,'[]',2),
('co3','combo','Combo Poutine','Combo Poutine','Loaded poutine and a soft drink.','Poutine garnie et une boisson.',4500,'[]',3),
('b1','burgers','The Classic Sanj','The Classic Sanj','Beef patty, cheddar, lettuce, pickles, house sauce.','Steak de bœuf, cheddar, laitue, cornichons, sauce maison.',3500,
  '[{"label":"Extra Cheese","label_fr":"Fromage extra","price":500},{"label":"Kilichi","label_fr":"Kilichi","price":750},{"label":"Extra Patty","label_fr":"Steak supplémentaire","price":1200}]',1),
('b2','burgers','Smoke Stack','Smoke Stack','Double patty, smoked gouda, crispy onions, BBQ glaze.','Double steak, gouda fumé, oignons croustillants, glaçage BBQ.',4500,
  '[{"label":"Extra Cheese","label_fr":"Fromage extra","price":500},{"label":"Kilichi","label_fr":"Kilichi","price":750},{"label":"Extra Patty","label_fr":"Steak supplémentaire","price":1200}]',2),
('b3','burgers','Double Deluxe','Double Deluxe','Two patties, double cheese, tomato, special sauce.','Deux steaks, double fromage, tomate, sauce spéciale.',5000,
  '[{"label":"Extra Cheese","label_fr":"Fromage extra","price":500},{"label":"Extra Patty","label_fr":"Steak supplémentaire","price":1200}]',3),
('f1','fries','Classic Fries','Frites Classiques','Hand-cut, double-fried, sea salt.','Coupées à la main, double cuisson, fleur de sel.',1500,
  '[{"label":"Ketchup","label_fr":"Ketchup","price":0},{"label":"Mayo","label_fr":"Mayo","price":0}]',1),
('f2','poutine','Loaded Poutine','Poutine Garnie','Fries, cheese curds, house gravy.','Frites, fromage en grains, sauce maison.',3000,'[]',1),
('f3','poutine','Truffle Poutine','Poutine Truffe','Fries, cheese curds, gravy, truffle oil.','Frites, fromage en grains, sauce, huile de truffe.',4000,'[]',2),
('s1','shakes','Milky Mint','Milky Mint','Mint-infused soft serve, chocolate shavings.','Glace à la menthe, copeaux de chocolat.',2500,'[]',1),
('s2','shakes','Vanilla Bean','Vanilla Bean','Madagascar vanilla, whipped cream.','Vanille de Madagascar, chantilly.',2000,'[]',2),
('s3','shakes','Salted Caramel','Salted Caramel','Caramel swirl, sea salt, whipped cream.','Tourbillon de caramel, fleur de sel, chantilly.',2500,'[]',3),
('c1','cocktails','Vodka Sour','Vodka Sour','House vodka, lemon, egg white. 21+.','Vodka maison, citron, blanc d''œuf. Réservé aux adultes.',5000,
  '[{"label":"Extra Vodka Shot","label_fr":"Shot de vodka supplémentaire","price":1500},{"label":"Add Rum","label_fr":"Ajouter du rhum","price":1500}]',1),
('c2','cocktails','Malta Mule','Malta Mule','Malta, ginger beer, lime. Non-alcoholic.','Malta, ginger beer, citron vert. Sans alcool.',2500,
  '[{"label":"Add Vodka","label_fr":"Ajouter de la vodka","price":1500},{"label":"Add Rum","label_fr":"Ajouter du rhum","price":1500}]',2),
('c3','cocktails','Sanj Spritz','Sanj Spritz','Sparkling water, grenadine, orange. Non-alcoholic.','Eau gazeuse, grenadine, orange. Sans alcool.',2000,
  '[{"label":"Add Vodka","label_fr":"Ajouter de la vodka","price":1500},{"label":"Add Gin","label_fr":"Ajouter du gin","price":1500}]',3),
('d1','soft_drinks','Coca-Cola','Coca-Cola','Classic, ice cold.','Classique, bien frais.',1000,'[]',1),
('d2','soft_drinks','Sprite','Sprite','Crisp and refreshing.','Rafraîchissant et pétillant.',1000,'[]',2),
('d3','soft_drinks','Malta','Malta','Rich malt soda.','Soda au malt, riche en goût.',1200,'[]',3),
('d4','soft_drinks','Sparkling Water','Eau Gazeuse','Still or sparkling.','Plate ou gazeuse.',800,'[]',4)
on conflict (id) do nothing;

insert into rewards (id, name, name_fr, cost, item_id) values
('r1','Free Cocktail','Cocktail offert',100,'c3'),
('r2','Free Mugi Burger','Mugi Burger offert',100,'b1'),
('r3','Free Combo','Combo offert',500,'co1')
on conflict (id) do nothing;

insert into promo_codes (code, percent_off) values ('SANJ10', 10)
on conflict (code) do nothing;
