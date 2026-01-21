 select 1; --test if the database is connected
 create table parks (
    id serial primary key,
    provider text not null default 'nps',
    name varchar(255) not null,
    address varchar(255) not null,
    cost int not null,
    description text not null,
    url varchar(255) not null,
    unique (provider, name, address, url)
 );

 create table weather (
    id serial primary key,
    provider text not null default 'weatherbit',
    city varchar(255) not null,
    country_code varchar(2) not null,
    data jsonb not null,
    unique (provider, city, country_code)
 );