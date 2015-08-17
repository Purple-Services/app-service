DROP DATABASE ebdb;
create database if not exists ebdb;
grant all on ebdb.* to 'purplemaster'@'localhost'  identified by 'localpurpledevelopment2015';
