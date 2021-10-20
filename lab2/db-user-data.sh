#!/bin/bash -ex
sudo yum -y update

sudo amazon-linux-extras install -y epel

# Add the Postgres repo
sudo tee /etc/yum.repos.d/pgdg.repo<<EOF
[pgdg13]
name=PostgreSQL 13 for RHEL/CentOS 7 - x86_64
baseurl=https://download.postgresql.org/pub/repos/yum/13/redhat/rhel-7-x86_64
enabled=1
gpgcheck=0
EOF

# Install Postgres
sudo yum -y install postgresql13 postgresql13-server

# Initialize the database
sudo /usr/pgsql-13/bin/postgresql-13-setup initdb

# Configure postgres to allow remote connections
sed -i "s/listen_addresses = 'localhost'/listen_addresses = '*'/g" /var/lib/pgsql/13/data/postgresql.conf

# Configure postgres to allow client connections from remote
echo 'host    all             all              0.0.0.0/0                       md5\nhost    all             all              ::/0                            md5' >> /var/lib/pgsql/13/data/pg_hba.conf

# Enable the postgres service
sudo systemctl enable --now postgresql-13

# Set the postgres password
sudo -i -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'caa_password123';"
