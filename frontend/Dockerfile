# Dockerfile de DÉVELOPPEMENT LOCAL uniquement — sans lien avec le
# déploiement de production (Vercel build directement depuis le dépôt via
# vercel.json, pas ce fichier). Voir docker-compose.yml à la racine.
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
