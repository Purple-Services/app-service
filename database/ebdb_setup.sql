DROP DATABASE if exists ebdb;
DROP DATABASE if exists ebdb_test;
create database if not exists ebdb;
create database if not exists ebdb_test;
grant all on ebdb.* to 'purplemaster'@'localhost'  identified by 'localpurpledevelopment2015';
grant all on ebdb_test.* to 'purplemaster'@'localhost' identified by 'localpurpledevelopment2015';
