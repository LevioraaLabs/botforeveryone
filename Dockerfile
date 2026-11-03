FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ cairo-dev pango-dev jpeg-dev giflib-dev librsvg-dev

COPY package*.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/

RUN npm ci --omit=dev

COPY . .

EXPOSE 3000 3001

CMD ["node", "index.js"]
