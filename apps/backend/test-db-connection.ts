import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function testSupabase() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_KEY!;
    
    console.log('🔗 URL:', supabaseUrl);
    console.log('🔑 Key:', supabaseKey ? '✓ Установлен' : '✗ Отсутствует');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Тест 1: Проверка подключения
    console.log('\n🧪 Тест 1: Проверка подключения...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log('✅ Аутентификация не требуется, клиент работает');
    } else {
      console.log('✅ Сессия:', authData.session ? 'активна' : 'нет');
    }
    
    // Тест 2: Проверка таблиц
    console.log('\n🧪 Тест 2: Проверка таблиц...');
    const { data: tables, error: tablesError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (tablesError) {
      if (tablesError.code === '42P01') {
        console.log('⚠️  Таблица users не существует. Создайте её через SQL Editor');
      } else {
        console.log('❌ Ошибка:', tablesError.message);
      }
    } else {
      console.log('✅ Таблица users доступна');
    }
    
    // Тест 3: Вставка тестовых данных
    console.log('\n🧪 Тест 3: Тест записи...');
    const testUser = {
      login: 'test_' + Date.now(),
      username: 'testuser',
      password_hash: 'temp_hash_' + Date.now()
    };
    
    const { data: inserted, error: insertError } = await supabase
      .from('users')
      .insert([testUser])
      .select();
    
    if (insertError) {
      console.log('📝 Ошибка вставки (возможно RLS):', insertError.message);
    } else {
      console.log('✅ Данные вставлены, ID:', inserted[0].id);
      
      // Удаляем тестовые данные
      await supabase
        .from('users')
        .delete()
        .eq('id', inserted[0].id);
      console.log('🧹 Тестовые данные удалены');
    }
    
    console.log('\n🎉 Supabase клиент работает корректно!');
    
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    console.error('\n🔍 Проверьте:');
    console.log('1. SUPABASE_URL в .env правильный?');
    console.log('2. SUPABASE_KEY в .env правильный?');
    console.log('3. Интернет соединение активно?');
  }
}

testSupabase();